import { AnalysisResult, AttackTree } from "./types";

export const SAMPLE_EOB = `EXPLANATION OF BENEFITS
Insurance Provider: United HealthCare PPO
Policy #: UHC-2026-PPO-4481
Member: Sarah Chen
Date of Service: February 28, 2026
Provider: Memorial General Hospital
Claim #: CLM-2026-0228-9947

ITEMIZED CHARGES:
1. Emergency Room Visit (Level 4) - CPT 99284 ........... $1,850.00
2. MRI Knee w/o Contrast - CPT 70553 .................... $3,400.00
3. MRI Knee w/o Contrast - CPT 70551 .................... $2,200.00
4. Physical Therapy Eval - CPT 97161 .................... $320.00
5. Physical Therapy Eval - CPT 97161 .................... $320.00
6. Comprehensive Metabolic Panel - CPT 80053 ............ $0.00
   - Basic Metabolic Panel - CPT 80048 .................. $185.00
   - Hepatic Function Panel - CPT 80076 ................. $210.00
   - Albumin - CPT 82040 ............................... $45.00
   - Total Protein - CPT 84155 .......................... $42.00
7. X-Ray Knee (2 views) - CPT 73560 .................... $380.00
8. Knee Brace/Support - HCPCS L1820 .................... $285.00
9. Physician Consultation - CPT 99243 ................... $475.00
10. Acetaminophen IV - HCPCS J0131 ...................... $480.00

TOTAL CHARGES: $10,192.00
INSURANCE PAID: $4,242.00

DENIAL NOTICE:
Line 2 (MRI Knee - CPT 70553): DENIED - Not medically necessary.
Reason Code: PR-234 — "Advanced imaging not authorized for initial visit. Prior authorization required per plan Section 4.2(b)."
Denied Amount: $3,400.00

PATIENT RESPONSIBILITY: $4,800.00
APPEAL RIGHTS: You may appeal within 180 days. External Review available after internal appeal per ACA §2719.
Date of Notice: March 1, 2026`;

export const SAMPLE_ANALYSIS: AnalysisResult = {
  summary:
    "Emergency room visit for knee injury. Multiple billing errors detected including a duplicate MRI charge, duplicate PT evaluation, and unbundled lab panel. The MRI was denied as 'not medically necessary' despite being physician-ordered — a strong appeal candidate.",
  totalBilled: "$10,192.00",
  totalOvercharged: "$3,622.00",
  deniedAmount: "$3,400.00",
  billingErrors: [
    {
      id: "err_1",
      type: "wrong_code",
      description:
        "MRI billed as CPT 70553 (with contrast, $3,400) while CPT 70551 (without contrast, $2,200) was also charged. Only one MRI performed.",
      originalCharge: "$3,400.00",
      estimatedOvercharge: "$1,200.00",
      cptCode: "70553→70551",
      evidence: "Both CPT 70553 and 70551 appear; only one MRI was performed.",
    },
    {
      id: "err_2",
      type: "duplicate",
      description: "Physical Therapy Evaluation (CPT 97161) billed twice at $320 each on same date.",
      originalCharge: "$640.00",
      estimatedOvercharge: "$320.00",
      cptCode: "97161",
      evidence: "Lines 4 and 5 are identical charges on the same date of service.",
    },
    {
      id: "err_3",
      type: "unbundling",
      description: "Comprehensive Metabolic Panel (CPT 80053) listed at $0 but component tests billed individually for $482 total.",
      originalCharge: "$482.00",
      estimatedOvercharge: "$232.00",
      cptCode: "80053 unbundled",
      evidence: "CPT 80053 at $0 while components are billed separately.",
    },
    {
      id: "err_4",
      type: "upcoding",
      description: "IV Acetaminophen billed at $480 vs. $20-40 wholesale cost — extreme markup.",
      originalCharge: "$480.00",
      estimatedOvercharge: "$440.00",
      cptCode: "J0131",
      evidence: "1,200%+ markup on a common medication.",
    },
  ],
  appealGrounds: [
    {
      id: "appeal_1",
      basis: "medical_necessity",
      argument: "MRI ordered by treating ER physician after exam and X-ray. Emergency MRIs are exempt from prior auth under ACA emergency service protections.",
      regulation: "ACA §2719, 42 USC §300gg-19a",
      strength: "strong",
    },
    {
      id: "appeal_2",
      basis: "coverage_terms",
      argument: "Plan Section 4.2(b) prior auth requirement does not apply to emergency department services per Plan Section 3.1 Emergency Benefits.",
      regulation: "Plan §3.1 Emergency Benefits",
      strength: "strong",
    },
    {
      id: "appeal_3",
      basis: "billing_error",
      argument: "Even if MRI charge stands, CPT 70553 (with contrast) is incorrectly coded — procedure was without contrast (CPT 70551). Correction alone saves $1,200.",
      regulation: undefined,
      strength: "strong",
    },
    {
      id: "appeal_4",
      basis: "regulatory",
      argument: "Under No Surprises Act, emergency services must be covered without prior authorization.",
      regulation: "No Surprises Act §2799A-1",
      strength: "moderate",
    },
  ],
  deadlines: [
    {
      id: "dl_1",
      action: "File internal appeal",
      date: "August 28, 2026",
      daysRemaining: 168,
      consequence: "Permanently lose the right to appeal the $3,400 MRI denial.",
      urgency: "high",
    },
    {
      id: "dl_2",
      action: "Request itemized bill",
      date: "Within 30 days recommended",
      daysRemaining: 17,
      consequence: "Harder to dispute after time passes. Hospital may send to collections.",
      urgency: "critical",
    },
    {
      id: "dl_3",
      action: "File external review if internal denied",
      date: "Within 60 days of denial",
      daysRemaining: -1,
      consequence: "Lose access to independent third-party review.",
      urgency: "medium",
    },
  ],
  riskLevel: "high",
  patientContext: "Sarah Chen, ER visit Feb 28 2026, knee injury. Insurance denied MRI as not medically necessary.",
};

export const SAMPLE_ATTACK_TREE: AttackTree = {
  nodes: [
    { id: "n0", type: "action",     label: "Request Itemized Bill",     description: "Call Memorial General billing and request full itemized bill with CPT codes. Legal right under federal law. Compare against EOB.", urgency: "immediate",  status: "ready",    documentType: "itemized_request" },
    { id: "n1", type: "document",   label: "File Billing Dispute",      description: "Send formal dispute letter citing: duplicate PT ($320), CPT code error ($1,200), unbundled labs ($232), IV Tylenol markup ($440). Total: $2,192.", urgency: "immediate",  status: "ready",    documentType: "itemized_request" },
    { id: "n2", type: "action",     label: "Correct CPT Code",          description: "Contact hospital coding dept. Request correction of CPT 70553 → 70551. Saves $1,200 regardless of appeal outcome.", urgency: "immediate",  status: "ready" },
    { id: "n3", type: "action",     label: "Get Physician Letter",      description: "Ask treating ER physician for a letter of medical necessity supporting the MRI order. Significantly strengthens appeal.", urgency: "this_week", status: "ready" },
    { id: "n4", type: "document",   label: "File Internal Appeal",      description: "Formal appeal to United HealthCare challenging MRI denial: emergency exemption (ACA §2719), medical necessity, coding error. Include physician letter.", urgency: "this_week", status: "ready",    documentType: "appeal_letter" },
    { id: "n5", type: "deadline",   label: "Appeal Deadline: Aug 28",   description: "180-day appeal window closes August 28, 2026. Missing it permanently forfeits the right to appeal the $3,400 MRI denial.", urgency: "this_month", status: "ready" },
    { id: "n6", type: "escalation", label: "File External Review",      description: "If internal appeal denied, file Independent External Review under ACA §2719 within 60 days. External reviewers overturn ~40% of denials.", urgency: "this_month", status: "blocked",  documentType: "external_review" },
    { id: "n7", type: "escalation", label: "State Insurance Complaint", description: "File complaint with State Insurance Commissioner. Triggers regulatory investigation. Can be filed in parallel with external review.", urgency: "this_month", status: "optional", documentType: "complaint" },
    { id: "n8", type: "outcome",    label: "Potential Recovery: $5,814",description: "Billing corrections: $2,192 + MRI appeal: $3,400 + CPT correction: $1,200. Even partial success recovers $2,192 from billing errors.", urgency: "this_month", status: "blocked" },
  ],
  edges: [
    { id: "e1",  source: "n0", target: "n1", label: "then dispute",    type: "sequence" },
    { id: "e2",  source: "n0", target: "n2", label: "parallel",        type: "parallel" },
    { id: "e3",  source: "n3", target: "n4", label: "attach to appeal",type: "sequence" },
    { id: "e4",  source: "n2", target: "n4", label: "include fix",     type: "sequence" },
    { id: "e5",  source: "n4", target: "n5", label: "before deadline", type: "sequence" },
    { id: "e6",  source: "n4", target: "n6", label: "if denied",       type: "fallback" },
    { id: "e7",  source: "n6", target: "n7", label: "in parallel",     type: "parallel" },
    { id: "e8",  source: "n6", target: "n8", label: "if approved",     type: "sequence" },
    { id: "e9",  source: "n1", target: "n8", label: "billing fixes",   type: "sequence" },
    { id: "e10", source: "n7", target: "n8", label: "pressure",        type: "sequence" },
  ],
  reasoning:
    "Prioritizes immediate billing corrections (itemized bill, CPT fix) for quick wins while building the main appeal. Physician letter strengthens appeal significantly. External review is the strongest fallback. Even without winning the appeal, billing error corrections alone recover $2,192.",
};

export const SAMPLE_DRAFT = `[YOUR NAME]
[YOUR ADDRESS]

${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}

United HealthCare Appeals Department
[RECIPIENT ADDRESS]

RE: APPEAL OF CLAIM DENIAL
Claim Number: CLM-2026-0228-9947
Policy Number: UHC-2026-PPO-4481
Member: Sarah Chen
Date of Service: February 28, 2026
Denied Service: MRI Knee (CPT 70553 / 70551)
Denied Amount: $3,400.00

Dear Appeals Review Board:

I am formally requesting reconsideration of the denial of my MRI claim, referenced above. The denial was issued under Reason Code PR-234, citing lack of prior authorization per Plan Section 4.2(b). This denial is incorrect for the following reasons:

1. EMERGENCY SERVICE EXEMPTION

The MRI was performed during an emergency department visit at Memorial General Hospital on February 28, 2026. Under the Affordable Care Act (42 USC §300gg-19a) and your plan's own Emergency Benefits provision (Section 3.1), emergency services are explicitly exempt from prior authorization requirements. The denial reason citing Section 4.2(b) does not apply to emergency department services.

2. MEDICAL NECESSITY

The MRI was ordered by the treating emergency physician after physical examination found insufficient findings on initial X-ray to rule out ligament damage or fracture. The imaging was medically necessary to determine the appropriate course of treatment and prevent harm from delayed diagnosis. I have attached a Letter of Medical Necessity from the treating physician.

3. CODING ERROR — SEPARATE GROUND FOR RELIEF

Even if the prior authorization argument is not accepted, the MRI was coded as CPT 70553 (MRI with contrast, $3,400.00) when the procedure was performed without contrast (CPT 70551, $2,200.00). This coding error resulted in a $1,200 overcharge independent of the denial. I request correction of this code and corresponding adjustment to the billed amount.

4. REGULATORY COMPLIANCE

Under the No Surprises Act (§2799A-1), emergency services must be covered at in-network rates without prior authorization requirements. Denial of emergency diagnostic imaging may constitute a violation of federal patient protection regulations.

REQUEST FOR RELIEF

I respectfully request that you:
(a) Overturn the denial and approve coverage of the MRI under emergency service provisions;
(b) In the alternative, correct the CPT code from 70553 to 70551 and adjust the patient responsibility accordingly;
(c) Provide the full utilization review rationale and reviewer credentials within 30 days per ACA §2719 requirements.

Please respond within 30 days as required by applicable regulations. I reserve all rights to escalate to Independent External Review under ACA §2719 if this appeal is denied.

Sincerely,

_________________________________
[YOUR NAME]
[YOUR ADDRESS]
[YOUR PHONE / EMAIL]`;

export const SAMPLE_STRUCTURED_FACTS = {
  patientName: "Sarah Chen",
  insurer: "United HealthCare PPO",
  policyNumber: "UHC-2026-PPO-4481",
  claimNumber: "CLM-2026-0228-9947",
  dateOfService: "February 28, 2026",
  totalBilled: "$10,192.00",
  deniedAmount: "$3,400.00",
  denialReason: "Not medically necessary — advanced imaging not authorized for initial visit. Prior authorization required per plan Section 4.2(b).",
  denialCode: "PR-234",
  appealDeadlineDays: 180,
  lineItems: [
    { description: "Emergency Room Visit (Level 4)", cptCode: "99284", amount: "$1,850.00", status: "paid" as const },
    { description: "MRI Knee w/o Contrast", cptCode: "70553", amount: "$3,400.00", status: "denied" as const },
    { description: "MRI Knee w/o Contrast", cptCode: "70551", amount: "$2,200.00", status: "billed" as const },
    { description: "Physical Therapy Eval", cptCode: "97161", amount: "$320.00", status: "billed" as const },
    { description: "Physical Therapy Eval (duplicate)", cptCode: "97161", amount: "$320.00", status: "billed" as const },
    { description: "Comprehensive Metabolic Panel", cptCode: "80053", amount: "$0.00", status: "billed" as const },
    { description: "X-Ray Knee (2 views)", cptCode: "73560", amount: "$380.00", status: "paid" as const },
    { description: "Knee Brace/Support", cptCode: "L1820", amount: "$285.00", status: "paid" as const },
    { description: "Physician Consultation", cptCode: "99243", amount: "$475.00", status: "paid" as const },
    { description: "Acetaminophen IV", cptCode: "J0131", amount: "$480.00", status: "billed" as const },
  ],
  rawSummary: "UHC denied MRI (CPT 70553, $3,400) as not medically necessary citing PR-234. Multiple billing errors detected. Appeal window is 180 days.",
};
