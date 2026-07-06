import fs from "fs";
import path from "path";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc } from "firebase/firestore";

// Types
export interface UserSubscription {
  plan: "free" | "starter" | "growth" | "enterprise";
  status: "active" | "inactive" | "trialing" | "canceled" | "pending";
  currentPeriodEnd: string;
  payoneerEmail?: string;
  transactionId?: string;
  paymentMethod?: "stripe" | "payoneer" | "bank_transfer";
  submittedAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "admin" | "editor" | "viewer";
  createdAt: string;
  subscription: UserSubscription;
}

export interface ContractRisk {
  id: string;
  category: string;
  severity: "high" | "medium" | "low";
  clauseText: string;
  description: string;
  suggestion: string;
}

export interface MissingClause {
  id: string;
  name: string;
  importance: "high" | "medium" | "low";
  description: string;
  suggestion: string;
}

export interface ContractComment {
  id: string;
  authorName: string;
  authorEmail: string;
  text: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  userId: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  rawContent: string;
  riskScore: number; // 0 to 100, where 100 is perfect and 0 is high risk
  summary: string;
  complianceRating: string; // e.g. "Good", "Needs Review", "Critical"
  risks: ContractRisk[];
  missingClauses: MissingClause[];
  draftText?: string;
  comments: ContractComment[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  ip: string;
  timestamp: string;
}

export interface DatabaseSchema {
  users: User[];
  contracts: Contract[];
  auditLogs: AuditLog[];
}

const DB_PATH = path.join(process.cwd(), "db.json");

// Default initial mock data for seamless first-load onboarding
const DEFAULT_USER_PASSWORD_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"; // SHA-256 for "admin123"

const getInitialData = (): DatabaseSchema => {
  const initialUser: User = {
    id: "usr_demo_1",
    email: "amanullahrana446@gmail.com",
    name: "Amanullah Rana",
    passwordHash: DEFAULT_USER_PASSWORD_HASH,
    role: "admin",
    createdAt: new Date().toISOString(),
    subscription: {
      plan: "growth",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
  };

  const initialContracts: Contract[] = [
    {
      id: "con_demo_1",
      userId: "usr_demo_1",
      title: "Mutual Non-Disclosure Agreement",
      fileName: "mutual_nda_draft_v2.txt",
      fileSize: "4.2 KB",
      fileType: "text/plain",
      rawContent: `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into on July 1, 2026, by and between:
SaaSify Inc. ("Disclosing Party") and LexiGuard Corp ("Receiving Party").

1. Confidential Information. The parties wish to explore a business relationship. In connection with this, either party may disclose proprietary technical or business information.

2. Term and Termination. This Agreement shall govern all disclosures for a period of two (2) years. However, the obligations of confidentiality and non-use with respect to all Confidential Information disclosed under this Agreement shall survive termination and remain in effect indefinitely.

3. Jurisdiction and Governing Law. This Agreement shall be governed by, and construed in accordance with, the laws of the State of Delaware, without giving effect to any principles of conflicts of law. Any legal suit, action or proceeding arising out of or related to this Agreement shall be instituted in the state or federal courts located in Wilmington, Delaware.

4. Limitation of Liability. IN NO EVENT SHALL THE DISCLOSING PARTY BE LIABLE TO THE RECEIVING PARTY FOR ANY INDIRECT, SPECIAL, INCIDENTAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES ARISING OUT OF THIS AGREEMENT. THE RECEIVING PARTY'S MAXIMUM AGGREGATE LIABILITY UNDER THIS AGREEMENT SHALL BE STRICTLY LIMITED TO $100.`,
      riskScore: 68,
      summary: "A standard Mutual Non-Disclosure Agreement with unbalanced liability protection and overly broad survival obligations on confidentiality.",
      complianceRating: "Needs Review",
      risks: [
        {
          id: "r_1",
          category: "Limitation of Liability",
          severity: "high",
          clauseText: "THE RECEIVING PARTY'S MAXIMUM AGGREGATE LIABILITY UNDER THIS AGREEMENT SHALL BE STRICTLY LIMITED TO $100.",
          description: "Unilateral liability cap set at a ridiculously low amount ($100). If a data breach or intellectual property leak occurs due to the Receiving Party's negligence, damages are effectively unrecoverable.",
          suggestion: "Remove the low $100 cap or negotiate a cap that is tied to actual damages, insurance coverage, or a specific fair multiple (e.g., $100,000 or 12 months of fees)."
        },
        {
          id: "r_2",
          category: "Confidentiality Survival Term",
          severity: "medium",
          clauseText: "obligations of confidentiality and non-use ... shall survive termination and remain in effect indefinitely.",
          description: "An indefinite survival period for standard commercial NDAs is highly unfavourable. Trade secrets can be kept indefinitely, but typical proprietary information should have a finite survival term (e.g., 3-5 years).",
          suggestion: "Change the indefinite term to 3 or 5 years post-termination, with an exception carved out for trade secrets which remain confidential as long as they qualify as such under applicable law."
        }
      ],
      missingClauses: [
        {
          id: "m_1",
          name: "Standard IP Carve-out / Protection",
          importance: "medium",
          description: "The agreement lacks a robust clause stating clearly that no license or transfer of intellectual property rights is granted or implied by sharing confidential information.",
          suggestion: "Add a standard reservation of intellectual property rights clause to safeguard SaaSify's product assets."
        },
        {
          id: "m_2",
          name: "Permitted Disclosures (Legal Compulsion)",
          importance: "medium",
          description: "There is no exception for compelled disclosures by law, subpoena, or government authority.",
          suggestion: "Insert a standard compelled disclosure clause allowing sharing if requested by a court order, provided prior notice is given to the other party."
        }
      ],
      comments: [
        {
          id: "cmt_1",
          authorName: "Amanullah Rana",
          authorEmail: "amanullahrana446@gmail.com",
          text: "We should flag this liability clause during our negotiations next Tuesday.",
          createdAt: new Date().toISOString()
        }
      ],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "con_demo_2",
      userId: "usr_demo_1",
      title: "Freelance Software Development Agreement",
      fileName: "freelance_dev_agreement_jul2026.txt",
      fileSize: "6.8 KB",
      fileType: "text/plain",
      rawContent: `FREELANCE DEVELOPMENT AGREEMENT

This Agreement is made between PixelCraft Studio ("Client") and Alex Miller ("Contractor").

1. Services. Contractor agrees to design and develop the LexiGuard Web App as specified in Exhibit A.
2. Payment. Client shall pay Contractor $5,000 upon successful completion and delivery. No deposit or milestone payments are specified.
3. Intellectual Property. All work product developed by Contractor shall remain the exclusive intellectual property of the Contractor until full and final payment of $5,000 is received. Upon full payment, intellectual property rights transfer to the Client.
4. Termination. Either party may terminate this agreement at any time with or without cause by giving forty-eight (48) hours notice.`,
      riskScore: 82,
      summary: "Freelance Agreement ensuring standard contractor payment and IP transfer rules. Main points of interest are the lack of payment milestones and a very short termination notice.",
      complianceRating: "Good",
      risks: [
        {
          id: "r_3",
          category: "Payment Terms",
          severity: "medium",
          clauseText: "Client shall pay Contractor $5,000 upon successful completion and delivery. No deposit or milestone payments are specified.",
          description: "Paying 100% on delivery leaves the contractor vulnerable to cash-flow delays, and leaves the client with zero leverage for course-correction if the work is unsatisfactory.",
          suggestion: "Structure payments in milestones (e.g., 30% upfront deposit, 40% on Beta, 30% on Final release) to align incentives."
        },
        {
          id: "r_4",
          category: "Termination Notice Period",
          severity: "medium",
          clauseText: "Either party may terminate this agreement at any time with or without cause by giving forty-eight (48) hours notice.",
          description: "A 48-hour termination notice without cause is extremely abrupt. A project can be cancelled mid-way, leaving the developer or client stranded on short notice.",
          suggestion: "Increase the notice period to 15 or 30 days, or add a 'kill fee' to compensate the contractor for work done if terminated by the client without cause."
        }
      ],
      missingClauses: [
        {
          id: "m_3",
          name: "Warranty and Acceptance Period",
          importance: "high",
          description: "The agreement does not define what constitutes 'successful completion' or outline a testing/acceptance period (e.g., 10 days) for the client to verify quality.",
          suggestion: "Include a 14-day Acceptance Testing Clause specifying criteria for rejection and remediation of bugs."
        }
      ],
      comments: [],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ];

  const initialLogs: AuditLog[] = [
    {
      id: "log_1",
      userId: "usr_demo_1",
      userEmail: "amanullahrana446@gmail.com",
      action: "WORKSPACE_INIT",
      details: "LexiGuard Secure Workspace initialized successfully for Growth Plan.",
      ip: "127.0.0.1",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "log_2",
      userId: "usr_demo_1",
      userEmail: "amanullahrana446@gmail.com",
      action: "CONTRACT_UPLOAD",
      details: "Uploaded and processed mutual_nda_draft_v2.txt. Risk Score: 68/100",
      ip: "127.0.0.1",
      timestamp: new Date(Date.now() - 1.9 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ];

  return {
    users: [initialUser],
    contracts: initialContracts,
    auditLogs: initialLogs
  };
};

// Firebase variables
let firebaseApp: any = null;
let firestoreDb: any = null;
let isInitializingFirebase = false;

const CONFIG_PATH = path.join(process.cwd(), "firebase-applet-config.json");

async function syncWithFirestore() {
  if (!firestoreDb) return;
  try {
    console.log("🔄 Starting background sync with Cloud Firestore...");
    const localData = Database.loadLocal();

    // 1. Fetch Users
    const usersSnap = await getDocs(collection(firestoreDb, "users"));
    const fbUsers: any[] = [];
    usersSnap.forEach((doc) => {
      fbUsers.push(doc.data());
    });

    // 2. Fetch Contracts
    const contractsSnap = await getDocs(collection(firestoreDb, "contracts"));
    const fbContracts: any[] = [];
    contractsSnap.forEach((doc) => {
      fbContracts.push(doc.data());
    });

    // 3. Fetch Audit Logs
    const logsSnap = await getDocs(collection(firestoreDb, "auditLogs"));
    const fbLogs: any[] = [];
    logsSnap.forEach((doc) => {
      fbLogs.push(doc.data());
    });

    let modified = false;

    // Merge users
    if (fbUsers.length === 0 && localData.users.length > 0) {
      console.log("🌱 Firestore 'users' is empty. Seeding from local db...");
      for (const u of localData.users) {
        await setDoc(doc(firestoreDb, "users", u.id), u);
      }
    } else if (fbUsers.length > 0) {
      for (const fbu of fbUsers) {
        const idx = localData.users.findIndex(u => u.id === fbu.id);
        if (idx === -1) {
          localData.users.push(fbu);
          modified = true;
        } else {
          localData.users[idx] = fbu;
          modified = true;
        }
      }
    }

    // Merge contracts
    if (fbContracts.length === 0 && localData.contracts.length > 0) {
      console.log("🌱 Firestore 'contracts' is empty. Seeding from local db...");
      for (const c of localData.contracts) {
        await setDoc(doc(firestoreDb, "contracts", c.id), c);
      }
    } else if (fbContracts.length > 0) {
      for (const fbc of fbContracts) {
        const idx = localData.contracts.findIndex(c => c.id === fbc.id);
        if (idx === -1) {
          localData.contracts.push(fbc);
          modified = true;
        } else {
          localData.contracts[idx] = fbc;
          modified = true;
        }
      }
    }

    // Merge logs
    if (fbLogs.length === 0 && localData.auditLogs.length > 0) {
      console.log("🌱 Firestore 'auditLogs' is empty. Seeding from local db...");
      for (const l of localData.auditLogs) {
        await setDoc(doc(firestoreDb, "auditLogs", l.id), l);
      }
    } else if (fbLogs.length > 0) {
      for (const fbl of fbLogs) {
        const idx = localData.auditLogs.findIndex(l => l.id === fbl.id);
        if (idx === -1) {
          localData.auditLogs.push(fbl);
          modified = true;
        } else {
          localData.auditLogs[idx] = fbl;
          modified = true;
        }
      }
    }

    if (modified) {
      Database.saveLocal(localData);
      console.log("💾 Firestore data successfully merged into local db.json!");
    } else {
      console.log("✅ Sync complete. Cloud and local databases are fully aligned.");
    }
  } catch (err) {
    console.error("❌ Error during background sync with Firestore:", err);
  }
}

function initFirebase() {
  if (firebaseApp || isInitializingFirebase) return;
  isInitializingFirebase = true;
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const configRaw = fs.readFileSync(CONFIG_PATH, "utf-8");
      const config = JSON.parse(configRaw);
      
      const firebaseConfig = {
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId
      };
      
      if (getApps().length === 0) {
        firebaseApp = initializeApp(firebaseConfig);
      } else {
        firebaseApp = getApp();
      }
      
      const dbId = config.firestoreDatabaseId || "(default)";
      firestoreDb = getFirestore(firebaseApp, dbId);
      console.log(`🔥 Firebase Firestore initialized successfully! Project: ${config.projectId}, Database ID: ${dbId}`);
      
      // Run background sync
      setTimeout(() => {
        syncWithFirestore().catch(console.error);
      }, 500);
    } else {
      console.warn("⚠️ firebase-applet-config.json not found. Running with local db.json fallback only.");
    }
  } catch (err) {
    console.error("❌ Failed to initialize Firebase:", err);
  } finally {
    isInitializingFirebase = false;
  }
}

async function uploadToFirestore(collectionName: string, id: string, data: any) {
  if (!firestoreDb) initFirebase();
  if (!firestoreDb) return;
  try {
    await setDoc(doc(firestoreDb, collectionName, id), data);
  } catch (err) {
    console.error(`❌ Failed to upload doc ${id} to collection ${collectionName} in Firestore:`, err);
  }
}

async function deleteFromFirestore(collectionName: string, id: string) {
  if (!firestoreDb) initFirebase();
  if (!firestoreDb) return;
  try {
    await deleteDoc(doc(firestoreDb, collectionName, id));
  } catch (err) {
    console.error(`❌ Failed to delete doc ${id} from collection ${collectionName} in Firestore:`, err);
  }
}

// Database class helper
export class Database {
  public static loadLocal(): DatabaseSchema {
    initFirebase();
    try {
      if (!fs.existsSync(DB_PATH)) {
        const initial = getInitialData();
        fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), "utf-8");
        return initial;
      }
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(raw);
    } catch (e) {
      console.error("Database reading failed, rebuilding with defaults:", e);
      const initial = getInitialData();
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
  }

  public static saveLocal(data: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Database write failed:", e);
    }
  }

  // Users CRUD
  static getUsers(): User[] {
    return this.loadLocal().users;
  }

  static getUserByEmail(email: string): User | undefined {
    return this.loadLocal().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  static getUserById(id: string): User | undefined {
    return this.loadLocal().users.find((u) => u.id === id);
  }

  static createUser(user: User): User {
    const data = this.loadLocal();
    data.users.push(user);
    this.saveLocal(data);
    uploadToFirestore("users", user.id, user).catch(console.error);
    return user;
  }

  static updateUserSubscription(userId: string, subscription: UserSubscription): User | null {
    const data = this.loadLocal();
    const userIndex = data.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) return null;
    data.users[userIndex].subscription = subscription;
    this.saveLocal(data);
    uploadToFirestore("users", userId, data.users[userIndex]).catch(console.error);
    return data.users[userIndex];
  }

  // Contracts CRUD
  static getContracts(userId: string): Contract[] {
    return this.loadLocal().contracts.filter((c) => c.userId === userId);
  }

  static getContractById(id: string): Contract | undefined {
    return this.loadLocal().contracts.find((c) => c.id === id);
  }

  static createContract(contract: Contract): Contract {
    const data = this.loadLocal();
    data.contracts.push(contract);
    this.saveLocal(data);
    uploadToFirestore("contracts", contract.id, contract).catch(console.error);
    return contract;
  }

  static updateContract(contract: Contract): Contract {
    const data = this.loadLocal();
    const idx = data.contracts.findIndex((c) => c.id === contract.id);
    if (idx !== -1) {
      data.contracts[idx] = contract;
      this.saveLocal(data);
      uploadToFirestore("contracts", contract.id, contract).catch(console.error);
    }
    return contract;
  }

  static deleteContract(id: string, userId: string): boolean {
    const data = this.loadLocal();
    const originalLength = data.contracts.length;
    data.contracts = data.contracts.filter((c) => !(c.id === id && c.userId === userId));
    this.saveLocal(data);
    deleteFromFirestore("contracts", id).catch(console.error);
    return data.contracts.length < originalLength;
  }

  // Audit Logs
  static getLogs(userId: string): AuditLog[] {
    return this.loadLocal().auditLogs.filter((l) => l.userId === userId);
  }

  static getAllLogs(): AuditLog[] {
    return this.loadLocal().auditLogs;
  }

  static addLog(userId: string, email: string, action: string, details: string, ip: string = "127.0.0.1") {
    const data = this.loadLocal();
    const log: AuditLog = {
      id: "log_" + Date.now() + Math.random().toString(36).substr(2, 5),
      userId,
      userEmail: email,
      action,
      details,
      ip,
      timestamp: new Date().toISOString(),
    };
    data.auditLogs.unshift(log);
    if (data.auditLogs.length > 200) {
      data.auditLogs = data.auditLogs.slice(0, 200);
    }
    this.saveLocal(data);
    uploadToFirestore("auditLogs", log.id, log).catch(console.error);
  }
}
