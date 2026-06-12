export enum AppTab {
  HOME = "home",
  UPLOAD = "upload",
  DASHBOARD = "dashboard",
  EXPLAINABLE_AI = "explainable_ai",
  REPORTS = "reports",
  ACCOUNT_LOOKUP = "account_lookup",
}

export interface Transaction {
  id: string;
  accountSource: string;
  destination: string;
  amount: number;
  timestamp: string;
  velocityFlag: "NORMAL" | "HIGH_RISK" | "SUSPICIOUS";
  riskScore: number;
  probability: number;
  category: string;
  status: "Active Alert" | "Under Review" | "Resolved";
  geoRegion?: string;
  row_index?: number;
  filename?: string;
}

export interface Anomaly {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  riskType: "error" | "primary" | "warning";
  riskLevel: string;
  accountEnding: string;
}

export interface ShapValue {
  feature: string;
  impactValue: number;
  impactType: "positive" | "negative";
  displayValue: string;
}

export interface FeatureWeight {
  feature: string;
  weightPercent: number;
  importance: "high" | "medium" | "low";
}

export interface Alert {
  id: string;
  accountId: string;
  category: string;
  confidence: number;
  detectedTime: string;
  status: "Active Alert" | "Under Review" | "Resolved";
}

export interface ReportConfig {
  timeRange: string;
  includeRiskAnalysis: boolean;
  includeRawTransactions: boolean;
  piiRedactionMode: boolean;
}

export interface ActivityLog {
  id: string;
  fileName: string;
  exportedBy: string;
  timeAgo: string;
  type: "pdf" | "excel" | "warning";
}
