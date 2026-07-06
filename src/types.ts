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
  role: "admin" | "editor" | "viewer";
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
  riskScore: number;
  summary: string;
  complianceRating: string;
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

export interface AnalyticsSummary {
  totalContracts: number;
  avgScore: number;
  highSeverityRisks: number;
  totalRisks: number;
  financialSavings: number;
  plan: string;
  currentPeriodEnd: string;
}

export interface CommonRiskMetric {
  name: string;
  count: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  commonRisks: CommonRiskMetric[];
  recentActivity: AuditLog[];
}
