export interface BillingError {
  id?: string;
  type: "duplicate" | "upcoding" | "wrong_code" | "unbundling" | "balance_billing" | "other";
  description: string;
  originalCharge: string;
  estimatedOvercharge: string;
  cptCode?: string;
  evidence: string;
}

export interface Deadline {
  id?: string;
  action: string;
  date: string;
  daysRemaining: number;
  consequence: string;
  urgency: "critical" | "high" | "medium" | "low";
}

export interface AppealGround {
  id?: string;
  basis: "medical_necessity" | "coverage_terms" | "regulatory" | "billing_error" | "coding_error" | "timely_filing";
  regulation?: string;
  argument: string;
  strength: "strong" | "moderate" | "weak";
}

export interface AnalysisResult {
  summary: string;
  totalBilled: string;
  totalOvercharged: string;
  deniedAmount: string;
  billingErrors: BillingError[];
  appealGrounds: AppealGround[];
  deadlines: Deadline[];
  riskLevel: "critical" | "high" | "medium" | "low";
  patientContext: string;
}

export interface AttackTreeNode {
  id: string;
  type: "action" | "deadline" | "document" | "escalation" | "outcome";
  label: string;
  description: string;
  urgency: "immediate" | "this_week" | "this_month";
  status: "ready" | "blocked" | "optional";
  documentType?: string;
  _col?: number;
  _colIdx?: number;
  _x?: number;
  _y?: number;
}

export interface AttackTreeEdge {
  id?: string;
  source: string;
  target: string;
  label?: string;
  type: "sequence" | "fallback" | "parallel";
}

export interface AttackTree {
  nodes: AttackTreeNode[];
  edges: AttackTreeEdge[];
  reasoning: string;
}

export interface DraftDocument {
  type: string;
  title: string;
  content: string;
  keyPoints: string[];
}

/** Intermediate structured extraction before full analysis */
export interface StructuredFacts {
  patientName: string;
  insurer: string;
  policyNumber: string;
  claimNumber: string;
  dateOfService: string;
  totalBilled: string;
  deniedAmount: string;
  denialReason: string;
  denialCode: string;
  appealDeadlineDays: number;
  lineItems: Array<{
    description: string;
    cptCode: string;
    amount: string;
    status: "paid" | "denied" | "pending" | "billed";
  }>;
  rawSummary: string;
}
