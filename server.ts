import express from "express";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import Stripe from "stripe";
import { Database, User, Contract, ContractRisk, MissingClause } from "./src/server/db.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for JSON and Urlencoded
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Helper function to hash passwords securely using native crypto
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Helper to extract session token user
function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access. Please login first." });
  }
  const token = authHeader.split(" ")[1];
  // For simplicity and 100% uptime without JWT deps, token is 'usr_token_<userId>'
  if (!token.startsWith("usr_token_")) {
    return res.status(401).json({ error: "Invalid authentication token." });
  }
  const userId = token.replace("usr_token_", "");
  const user = Database.getUserById(userId);
  if (!user) {
    return res.status(401).json({ error: "Session expired or user not found." });
  }
  (req as any).user = user;
  next();
}

// Initialize Gemini SDK with telemetry header
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("⚠️ GEMINI_API_KEY env variable is missing! AI features will run in Mock/Sandbox mode.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Lazy initialization of Stripe SDK
let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2025-01-27" as any,
    });
  }
  return stripeClient;
}

// Plan Prices Configuration
const planDetails = {
  starter: { name: "LexiGuard Starter Plan", amount: 4900 },
  growth: { name: "LexiGuard Growth Plan", amount: 14900 },
  enterprise: { name: "LexiGuard Enterprise Plan", amount: 49900 },
};

// API Routes
// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// 2. Auth Routes
app.post("/api/auth/register", (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Please provide all required registration fields." });
    }

    const existingUser = Database.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email address already exists." });
    }

    const userId = "usr_" + Date.now();
    const newUser: User = {
      id: userId,
      email: email.toLowerCase(),
      name,
      passwordHash: hashPassword(password),
      role: "admin",
      createdAt: new Date().toISOString(),
      subscription: {
        plan: "free",
        status: "trialing",
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days trial
      },
    };

    Database.createUser(newUser);
    Database.addLog(newUser.id, newUser.email, "USER_REGISTER", `Registered account: ${newUser.name}`);

    // Return profile + mock session token
    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        subscription: newUser.subscription,
      },
      token: `usr_token_${newUser.id}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Registration failed on server." });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Please provide both email and password." });
    }

    const user = Database.getUserByEmail(email);
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: "Invalid email or password combination." });
    }

    Database.addLog(user.id, user.email, "USER_LOGIN", `Logged in from IP`);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscription: user.subscription,
      },
      token: `usr_token_${user.id}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Login failed on server." });
  }
});

app.get("/api/auth/me", authenticate, (req, res) => {
  const user = (req as any).user;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      subscription: user.subscription,
    },
  });
});

// 3. Contracts List & CRUD
app.get("/api/contracts", authenticate, (req, res) => {
  const user = (req as any).user;
  const contracts = Database.getContracts(user.id);
  res.json({ contracts });
});

app.get("/api/contracts/:id", authenticate, (req, res) => {
  const user = (req as any).user;
  const contract = Database.getContractById(req.params.id);
  if (!contract || contract.userId !== user.id) {
    return res.status(404).json({ error: "Contract not found in this workspace." });
  }
  res.json({ contract });
});

app.delete("/api/contracts/:id", authenticate, (req, res) => {
  const user = (req as any).user;
  const contract = Database.getContractById(req.params.id);
  if (!contract || contract.userId !== user.id) {
    return res.status(404).json({ error: "Contract not found." });
  }
  Database.deleteContract(req.params.id, user.id);
  Database.addLog(user.id, user.email, "CONTRACT_DELETE", `Deleted contract: ${contract.title}`);
  res.json({ success: true, message: "Contract removed successfully." });
});

// 4. Contract Comments & Annotations
app.post("/api/contracts/:id/comments", authenticate, (req, res) => {
  try {
    const user = (req as any).user;
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Comment text cannot be empty." });
    }

    const contract = Database.getContractById(req.params.id);
    if (!contract || contract.userId !== user.id) {
      return res.status(404).json({ error: "Contract not found." });
    }

    const comment = {
      id: "cmt_" + Date.now(),
      authorName: user.name,
      authorEmail: user.email,
      text,
      createdAt: new Date().toISOString(),
    };

    contract.comments.push(comment);
    Database.updateContract(contract);
    Database.addLog(user.id, user.email, "COMMENT_ADD", `Added note to: ${contract.title}`);

    res.status(201).json({ comment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Contract AI Analysis
app.post("/api/contracts/analyze", authenticate, async (req, res) => {
  const user = (req as any).user;
  const { title, fileName, fileSize, fileType, rawContent } = req.body;

  if (!title || !rawContent) {
    return res.status(400).json({ error: "Missing required fields (title, rawContent)." });
  }

  // Rate limits or subscription guards
  const isPremiumActive = user.subscription && user.subscription.plan !== "free" && user.subscription.status === "active";
  const userContractsCount = Database.getContracts(user.id).length;
  if (!isPremiumActive && userContractsCount >= 3) {
    if (user.subscription && user.subscription.status === "pending") {
      return res.status(403).json({
        error: "Your workspace is still on the Free Trial (limit: 3 contracts) because your Payoneer subscription request is pending administrator verification.",
        limitReached: true,
      });
    }
    return res.status(403).json({
      error: "You have reached the limit of 3 contract reviews on the Free Trial. Please upgrade to Growth or Pro and submit your payment details to analyze more files.",
      limitReached: true,
    });
  }

  try {
    let analysisResult;

    if (process.env.GEMINI_API_KEY) {
      const ai = getAiClient();
      const prompt = `Analyze the following legal contract/text for risks, missing clauses, and overall liability. Provide high-quality analysis.
Contract Title: ${title}
Contract File Name: ${fileName || "unknown"}
Contract Content:
"""
${rawContent}
"""

You must output a single JSON object strictly matching this schema:
{
  "summary": "An descriptive high-level legal summary of the document, its intent, and general risk outlook (2-3 sentences)",
  "riskScore": 75, // An integer score between 0 and 100, where 100 is perfectly safe and 0 is extremely high risk
  "complianceRating": "Good" | "Needs Review" | "Critical", // Choose the rating carefully based on risk score (>=80 is Good, 60-79 is Needs Review, <60 is Critical)
  "risks": [
    {
      "category": "Name of risk category, e.g. Indemnification, Limitation of Liability, Termination Notice, Governing Law",
      "severity": "high" | "medium" | "low",
      "clauseText": "Exact quote or brief excerpt of the problematic clause text from the contract",
      "description": "Thorough, clear explanation of why this clause constitutes a risk to the party signing it",
      "suggestion": "Actionable, precise legal redline recommendation or mitigation tactic"
    }
  ],
  "missingClauses": [
    {
      "name": "Name of standard legal clause that is missing but highly recommended",
      "importance": "high" | "medium" | "low",
      "description": "Why the absence of this clause represents a legal loophole or risk",
      "suggestion": "Drafted boilerplate template clause that can be added to fix the gap"
    }
  ]
}

Respond ONLY with the JSON object. Do not include markdown code blocks, preamble, or commentary.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              riskScore: { type: Type.INTEGER },
              complianceRating: { type: Type.STRING },
              risks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    clauseText: { type: Type.STRING },
                    description: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                  },
                  required: ["category", "severity", "clauseText", "description", "suggestion"],
                },
              },
              missingClauses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    importance: { type: Type.STRING },
                    description: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                  },
                  required: ["name", "importance", "description", "suggestion"],
                },
              },
            },
            required: ["summary", "riskScore", "complianceRating", "risks", "missingClauses"],
          },
        },
      });

      const parsedText = response.text || "{}";
      analysisResult = JSON.parse(parsedText);
    } else {
      // Fallback Mock Analyzer when API key is missing to maintain perfect offline testing
      console.log("Using backend fallback contract analyzer...");
      const textLen = rawContent.length;
      const score = Math.max(40, Math.min(95, 100 - Math.floor(textLen / 150)));
      let rating = "Good";
      if (score < 60) rating = "Critical";
      else if (score < 80) rating = "Needs Review";

      analysisResult = {
        summary: `Offline Sandbox Mode analysis: This is a simulated legal assessment of '${title}'. The text of ${textLen} characters was processed successfully.`,
        riskScore: score,
        complianceRating: rating,
        risks: [
          {
            category: "Sandbox Liability Guard",
            severity: "high",
            clauseText: rawContent.slice(0, 150) + "...",
            description: "No verified server-side Gemini API key was located in the platform's Environment Secrets, forcing sandbox heuristics. Original clauses could contain hidden liability risks.",
            suggestion: "Go to AI Studio Settings > Secrets and configure a valid GEMINI_API_KEY to activate full AI risk reports."
          },
          {
            category: "Standard Termination Rule",
            severity: "medium",
            clauseText: rawContent.slice(Math.floor(textLen/2), Math.floor(textLen/2) + 120),
            description: "Notice period could not be fully parsed. Standard default notice terms might favor the other contracting party.",
            suggestion: "Insist on a reciprocal 30-day notice for termination without cause."
          }
        ],
        missingClauses: [
          {
            name: "Intellectual Property Ownership Reservation",
            importance: "high",
            description: "The contract fails to explicitly reserve IP ownership prior to final invoices being settled.",
            suggestion: "No transfer of title, ownership, or intellectual property rights in any Software deliverables shall take place until Client has fully paid all outstanding invoices due to Contractor."
          }
        ]
      };
    }

    // Save analyzed contract to file database
    const contractId = "con_" + Date.now();
    const parsedContract: Contract = {
      id: contractId,
      userId: user.id,
      title,
      fileName: fileName || "manual_input.txt",
      fileSize: fileSize || `${Math.round(rawContent.length / 1024 * 10) / 10} KB`,
      fileType: fileType || "text/plain",
      rawContent,
      riskScore: analysisResult.riskScore,
      summary: analysisResult.summary,
      complianceRating: analysisResult.complianceRating,
      risks: analysisResult.risks.map((r: any, idx: number) => ({ id: `r_ai_${idx}`, ...r })),
      missingClauses: analysisResult.missingClauses.map((m: any, idx: number) => ({ id: `m_ai_${idx}`, ...m })),
      comments: [],
      createdAt: new Date().toISOString(),
    };

    Database.createContract(parsedContract);
    Database.addLog(user.id, user.email, "CONTRACT_ANALYZE", `Analyzed and generated report for: ${title}. Score: ${parsedContract.riskScore}/100`);

    res.status(201).json({ contract: parsedContract });
  } catch (err: any) {
    console.error("Analysis route failure:", err);
    res.status(500).json({ error: "Contract analysis failed due to backend engine error: " + err.message });
  }
});

// 6. Agreement AI Drafting Assistant
app.post("/api/contracts/draft", authenticate, async (req, res) => {
  const user = (req as any).user;
  const { agreementType, businessName, counterpartyName, industry, specificRules } = req.body;

  if (!agreementType || !businessName) {
    return res.status(400).json({ error: "Missing required drafting parameters." });
  }

  try {
    let draftText = "";
    let summary = "";

    if (process.env.GEMINI_API_KEY) {
      const ai = getAiClient();
      const prompt = `Draft a comprehensive, highly protective, professional legal contract of type: ${agreementType}.
Details:
- Drafting for (My Business): ${businessName}
- Counterparty: ${counterpartyName || "Unnamed Counterparty"}
- Industry: ${industry || "Technology"}
- Particular Rules/Exclusions: ${specificRules || "None"}

The contract must be thorough, including a proper title, preamble, standard commercial terms (IP assignment, liability, confidentiality, governing law Delaware), and sign-off blocks. Make sure it is legally structured and highly professional.

Additionally, provide a short summary of the agreement.

You must output a single JSON object strictly matching this schema:
{
  "draftText": "The complete formatted legal text of the drafted contract (Markdown is encouraged for headings, paragraphs and list formatting)",
  "briefSummary": "A concise, executive summary explaining the main protections built into this draft (2-3 sentences)"
}

Respond ONLY with the JSON object. Do not include markdown code blocks outside of the JSON representation, preamble, or commentary.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              draftText: { type: Type.STRING },
              briefSummary: { type: Type.STRING },
            },
            required: ["draftText", "briefSummary"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      draftText = parsed.draftText;
      summary = parsed.briefSummary;
    } else {
      // Mock Drafting Fallback
      summary = `Simulated drafting of a ${agreementType} for ${businessName} protecting intellectual property assets.`;
      draftText = `# MUTUAL NON-DISCLOSURE AGREEMENT

**THIS AGREEMENT** is entered into as of the date of signing, by and between **${businessName}** and **${counterpartyName || "Counterparty"}** (collectively, the "Parties").

## 1. Purpose
The Parties desire to engage in discussions regarding potential joint ventures, SaaS integrations, or software services within the **${industry || "Technology"}** sector (the "Authorized Purpose"). In connection with these discussions, either party may disclose confidential, proprietary, or trade secret information.

## 2. Definition of Confidential Information
"Confidential Information" means all non-public, proprietary information disclosed by one party (the "Disclosing Party") to the other party (the "Receiving Party"), whether orally, visually, or in writing, that is designated as confidential or that should be understood to be confidential given the nature of the information.

## 3. Obligations of Receiving Party
The Receiving Party shall:
- Maintain the strict confidentiality of the Disclosing Party's Confidential Information.
- Use the Confidential Information solely for the Authorized Purpose.
- Not disclose Confidential Information to any third party without written consent.

## 4. Specific Provisions & Custom Rules
${specificRules ? `The Parties agree to the following additional stipulation: ${specificRules}` : "Standard reciprocal protection rules apply with zero waiver of patent, copyright, or trademark rights."}

## 5. Term and Governing Law
This Agreement shall remain in effect for three (3) years from the date hereof. This Agreement is governed by the laws of the State of Delaware.

---
**${businessName}**
By: ____________________
Title: Authorized Signatory

**${counterpartyName || "Counterparty"}**
By: ____________________
Title: Authorized Signatory`;
    }

    Database.addLog(user.id, user.email, "CONTRACT_DRAFT", `Drafted new ${agreementType} agreement using AI Assistant.`);

    res.json({ draftText, briefSummary: summary });
  } catch (err: any) {
    console.error("Drafting failure:", err);
    res.status(500).json({ error: "Failed to draft contract: " + err.message });
  }
});

// 7. Workspace Analytics
app.get("/api/analytics", authenticate, (req, res) => {
  try {
    const user = (req as any).user;
    const contracts = Database.getContracts(user.id);
    const logs = user.role === "admin" ? Database.getAllLogs() : Database.getLogs(user.id);

    const totalContracts = contracts.length;
    let avgScore = 0;
    let highSeverityRisks = 0;
    let totalRisks = 0;
    const categoryDistribution: { [key: string]: number } = {};

    if (totalContracts > 0) {
      const sum = contracts.reduce((acc, c) => acc + c.riskScore, 0);
      avgScore = Math.round(sum / totalContracts);

      contracts.forEach((c) => {
        c.risks.forEach((r) => {
          totalRisks++;
          if (r.severity === "high") highSeverityRisks++;
          categoryDistribution[r.category] = (categoryDistribution[r.category] || 0) + 1;
        });
      });
    } else {
      avgScore = 0;
    }

    // Convert category distribution to array
    const commonRisks = Object.entries(categoryDistribution)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Business value simulation
    const hourlyLegalRate = 350; // $350/hr standard legal fee
    const hoursSavedPerContract = 2; // Average lawyer hours to review NDA/contract
    const financialSavings = totalContracts * hoursSavedPerContract * hourlyLegalRate;

    // Get pending subscriptions for admin view
    const pendingSubscriptions = user.role === "admin"
      ? Database.getUsers()
          .filter((u) => u.subscription?.status === "pending")
          .map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            subscription: u.subscription,
          }))
      : [];

    res.json({
      summary: {
        totalContracts,
        avgScore,
        highSeverityRisks,
        totalRisks,
        financialSavings,
        plan: user.subscription.plan,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
      },
      commonRisks,
      recentActivity: logs.slice(0, 10),
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      payoneerEmail: process.env.PAYONEER_EMAIL || "amanullahrana446@gmail.com",
      pendingSubscriptions,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Submit Payoneer payment details
app.post("/api/billing/payoneer-submit", authenticate, (req, res) => {
  try {
    const user = (req as any).user;
    const { plan, payoneerEmail, transactionId } = req.body;

    if (!["starter", "growth", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "Invalid subscription plan selected." });
    }
    if (!payoneerEmail || !transactionId) {
      return res.status(400).json({ error: "Payoneer Email and Transaction ID are required." });
    }

    const subscription = {
      plan: plan as any,
      status: "pending" as const,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      payoneerEmail,
      transactionId,
      paymentMethod: "payoneer" as const,
      submittedAt: new Date().toISOString(),
    };

    Database.updateUserSubscription(user.id, subscription);
    Database.addLog(user.id, user.email, "PAYONEER_SUBMIT", `Submitted Payoneer payment proof for ${plan.toUpperCase()} Plan. (Sender: ${payoneerEmail}, TxID: ${transactionId})`);

    res.json({
      success: true,
      message: "Payment details submitted successfully! Your account will be upgraded once the administrator approves your transaction.",
      subscription,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Approve pending subscription
app.post("/api/admin/approve-subscription", authenticate, (req, res) => {
  try {
    const admin = (req as any).user;
    if (admin.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    const targetUser = Database.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    if (targetUser.subscription.status !== "pending") {
      return res.status(400).json({ error: "User does not have a pending subscription." });
    }

    const updatedSubscription = {
      ...targetUser.subscription,
      status: "active" as const,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    Database.updateUserSubscription(userId, updatedSubscription);
    Database.addLog(admin.id, admin.email, "SUBSCRIPTION_APPROVE", `Approved Payoneer subscription for ${targetUser.email} to ${targetUser.subscription.plan.toUpperCase()}`);
    Database.addLog(userId, targetUser.email, "SUBSCRIPTION_UPGRADE", `Your Payoneer subscription to ${targetUser.subscription.plan.toUpperCase()} was approved by Admin.`);

    res.json({ success: true, message: "Subscription approved successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reject pending subscription
app.post("/api/admin/reject-subscription", authenticate, (req, res) => {
  try {
    const admin = (req as any).user;
    if (admin.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    const targetUser = Database.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    if (targetUser.subscription.status !== "pending") {
      return res.status(400).json({ error: "User does not have a pending subscription." });
    }

    const updatedSubscription = {
      plan: "free" as const,
      status: "canceled" as const,
      currentPeriodEnd: new Date().toISOString(),
    };

    Database.updateUserSubscription(userId, updatedSubscription);
    Database.addLog(admin.id, admin.email, "SUBSCRIPTION_REJECT", `Rejected Payoneer subscription request for ${targetUser.email}`);
    Database.addLog(userId, targetUser.email, "SUBSCRIPTION_CANCEL", `Your Payoneer subscription request was rejected by Admin.`);

    res.json({ success: true, message: "Subscription request rejected." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Subscription Billing Simulation (Dual-mode: Simulated Sandbox & Real Stripe)
app.post("/api/billing/subscribe", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { plan } = req.body;

    if (!["starter", "growth", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "Invalid subscription plan selected." });
    }

    const stripe = getStripe();
    if (stripe) {
      // Real Stripe integration is active!
      const planInfo = planDetails[plan as keyof typeof planDetails];
      const hostUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: planInfo.name,
                description: `Automated Contract Risk Scans & Legal Drafting (${plan.toUpperCase()} Plan)`,
              },
              unit_amount: planInfo.amount,
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        client_reference_id: user.id,
        metadata: {
          plan,
        },
        success_url: `${hostUrl}/api/billing/stripe-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${hostUrl}/`,
      });

      return res.json({
        success: true,
        url: session.url,
        isRealStripe: true,
      });
    }

    // Fallback simulation mode when Stripe credentials are not provided
    const subscription = {
      plan: plan as any,
      status: "active" as any,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    Database.updateUserSubscription(user.id, subscription);
    Database.addLog(user.id, user.email, "SUBSCRIPTION_UPGRADE", `Upgraded from Free Trial to: ${plan.toUpperCase()} Plan (SIMULATED)`);

    res.json({
      success: true,
      message: `Subscription to ${plan.toUpperCase()} plan completed (Simulated Sandbox).`,
      subscription,
      isRealStripe: false,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stripe Checkout Success callback
app.get("/api/billing/stripe-success", async (req, res) => {
  const { session_id } = req.query;
  if (!session_id || typeof session_id !== "string") {
    return res.redirect("/?payment_status=invalid");
  }

  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.redirect("/?payment_status=no_stripe");
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    const userId = session.client_reference_id;
    const plan = session.metadata?.plan;

    if (userId && plan) {
      const subscription = {
        plan: plan as any,
        status: "active" as any,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const user = Database.getUserById(userId);
      if (user) {
        Database.updateUserSubscription(userId, subscription);
        Database.addLog(userId, user.email, "SUBSCRIPTION_UPGRADE", `Stripe subscription activated: ${plan.toUpperCase()} Plan`);
        return res.redirect("/?payment_status=success&plan=" + plan);
      }
    }
    res.redirect("/?payment_status=error");
  } catch (err: any) {
    console.error("Stripe callback failure:", err);
    res.redirect("/?payment_status=error&msg=" + encodeURIComponent(err.message));
  }
});

app.post("/api/billing/cancel", authenticate, (req, res) => {
  try {
    const user = (req as any).user;
    const subscription = {
      plan: "free" as any,
      status: "canceled" as any,
      currentPeriodEnd: new Date().toISOString(),
    };

    Database.updateUserSubscription(user.id, subscription);
    Database.addLog(user.id, user.email, "SUBSCRIPTION_CANCEL", `Canceled subscription. Reverted to Free plan.`);

    res.json({
      success: true,
      message: "Subscription canceled successfully. Account reverted to Free Tier.",
      subscription,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve Frontend using Vite Dev Middleware in dev, or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 LexiGuard AI SaaS running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server startup failure:", err);
});
