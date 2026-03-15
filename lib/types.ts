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
  totalBilled: string | null;
  totalOvercharged: string | null;
  deniedAmount: string | null;
  billingErrors: BillingError[];
  appealGrounds: AppealGround[];
  deadlines: Deadline[];
  riskLevel: "critical" | "high" | "medium" | "low";
  patientContext: string;
  warnings?: string[];
}

export interface EvidenceItem {
  id: string;
  label: string;
  sourceType:
    | "user_document"
    | "policy_excerpt"
    | "regulation"
    | "template"
    | "provider_note"
    | "derived_signal"
    | "uploaded_file";
  snippet: string;
  relevanceScore: number;
  scoreSource?: "model_service" | "heuristic";
  scoreConfidence?: number;
  scoreReasoning?: string;
  supportsNodeIds?: string[];
  missing: boolean;
}

export interface EvidenceRelevanceRequest {
  label: string;
  snippet: string;
  sourceType:
    | "user_document"
    | "policy_excerpt"
    | "regulation"
    | "template"
    | "provider_note"
    | "derived_signal"
    | "uploaded_file";
  missing?: boolean;
  analysisSummary?: string;
  denialReason?: string;
  patientContext?: string;
  insurer?: string;
  appealGrounds?: string[];
  targetNodeLabel?: string;
  targetNodeType?: string;
}

export interface EvidenceRelevanceScore {
  relevanceScore: number;
  confidence: number;
  source: "model_service" | "heuristic";
  reasoning: string;
  evidenceScore?: number;
  caseSimilarity?: number;
  warning?: string;
}

export interface EvidenceIngestionResult {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  ingestionStatus: "parsed_text" | "parsed_pdf" | "metadata_only";
  extractedText: string;
  excerpt: string;
  warnings: string[];
}

export interface VaultDocumentSnapshot {
  id: string;
  name: string;
  meta: string;
  category: string;
  snippet: string;
  extractedText?: string;
  ingestionStatus?: "parsed_text" | "parsed_pdf" | "metadata_only";
  ingestionWarnings?: string[];
  sourceType: EvidenceItem["sourceType"] | "uploaded_file";
  relevanceScore: number;
  scoreSource?: "model_service" | "heuristic";
  scoreConfidence?: number;
  scoreReasoning?: string;
  verified: boolean;
  linked: boolean;
  missing: boolean;
}

export interface DraftEditorSnapshot {
  content: string;
  lastSavedAt?: string;
}

export interface SubmissionSnapshot {
  method: "fax" | "mail";
  status: "draft" | "exported";
  trackingId?: string;
  recipient: string;
  confirmationEmail: string;
  smsOptIn: boolean;
  submittedAt?: string;
  notes?: string;
}

export interface ActivitySnapshot {
  id: string;
  label: string;
  body: string;
  timestamp: string;
  type: "system" | "upload" | "draft" | "submission" | "support";
}

export interface AppealRiskScore {
  riskScore: number;
  source: "model_service" | "heuristic";
  featureContractComplete: boolean;
  warning?: string;
}

export interface BranchScore {
  branchTemplateId: string;
  branchId: string;
  viabilityScore: number;
  favorableOutcomeProbability: number;
  escalationLevel: "low" | "medium" | "high";
  confidence: number;
  source: "model_service" | "heuristic";
}

export interface BlindSpotSignal {
  primaryLabel: string;
  primaryScore: number;
  secondaryLabel?: string;
  secondaryScore?: number;
  matchedText?: string;
  source: "model_service" | "heuristic";
}

export interface Explanation {
  recommendedNodeId?: string;
  whySelected: string;
  strongestSignals: string[];
  evidenceUsed: string[];
  missingInfo: string[];
  fallbackOptions: string[];
}

export interface AttackTreeNode {
  id: string;
  type: "action" | "deadline" | "document" | "evidence" | "escalation" | "outcome";
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
  branchScores?: BranchScore[];
  explanation?: Explanation;
  evidenceItems?: EvidenceItem[];
  appealRisk?: AppealRiskScore;
  blindSpotSignals?: BlindSpotSignal[];
}

export interface DraftDocument {
  type: string;
  title: string;
  content: string;
  keyPoints: string[];
  explanation?: Explanation;
}

export interface UploadedEvidenceInput {
  id?: string;
  name: string;
  category?: string;
  snippet?: string;
  extractedText?: string;
  ingestionStatus?: "parsed_text" | "parsed_pdf" | "metadata_only";
  ingestionWarnings?: string[];
}

export interface CasePipelineResult {
  documentText: string;
  structuredFacts: StructuredFacts;
  analysis: AnalysisResult;
  strategy: AttackTree;
  draft: DraftDocument;
}

export interface PersistedCaseSession extends CasePipelineResult {
  useSampleMode: boolean;
  draftEditor: DraftEditorSnapshot;
  vaultDocuments: VaultDocumentSnapshot[];
  submission: SubmissionSnapshot;
  activity: ActivitySnapshot[];
  selectedNodeId?: string;
  generatedAt: string;
  notices?: string[];
}

export interface StoredCaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  payload: PersistedCaseSession;
}

/** Intermediate structured extraction before full analysis */
export interface StructuredFacts {
  patientName: string;
  insurer: string;
  policyNumber: string;
  claimNumber: string;
  dateOfService: string;
  totalBilled: string | null;
  deniedAmount: string | null;
  denialReason: string;
  denialCode: string;
  appealDeadlineDays: number | null;
  lineItems: Array<{
    description: string;
    cptCode: string;
    amount: string;
    status: "paid" | "denied" | "pending" | "billed";
  }>;
  rawSummary: string;
}

export interface StructureRequest {
  documentText: string;
  useSampleMode?: boolean;
  apiKey?: string;
}

export interface AnalyzeRequest {
  documentText: string;
  structuredFacts?: StructuredFacts;
  useSampleMode?: boolean;
  apiKey?: string;
}

export interface StrategyRequest {
  analysis: AnalysisResult;
  structuredFacts?: StructuredFacts;
  useSampleMode?: boolean;
  apiKey?: string;
}

export interface DraftRequest {
  nodeLabel: string;
  nodeDescription: string;
  documentType?: string;
  analysis: AnalysisResult;
  structuredFacts?: StructuredFacts;
  useSampleMode?: boolean;
  apiKey?: string;
}

export interface AppealRiskRequest {
  insuranceType?: string;
  claimType?: string;
  diagnosisChapter?: string;
  denialReason?: string;
  providerType?: string;
  numericFeatures?: Record<string, number>;
}

export interface BranchViabilityRequest {
  issueClass: string;
  branchType: string;
  evidenceScore: number;
  caseSimilarity: number;
  jurisdiction: string;
}

export interface BlindSpotRequest {
  text: string;
}

export interface CaseReanalysisRequest {
  documentText: string;
  useSampleMode?: boolean;
  apiKey?: string;
  structuredFacts?: StructuredFacts;
  analysis?: AnalysisResult;
  strategy?: AttackTree;
  evidenceDocuments?: UploadedEvidenceInput[];
}

export interface PipelineProgress {
  status: "partial";
  documentText: string;
  useSampleMode: boolean;
  lastCompletedStep: "structure" | "analyze" | "strategy";
  structuredFacts?: StructuredFacts;
  analysis?: AnalysisResult;
  strategy?: AttackTree;
  errorMessage: string;
  updatedAt: string;
}
