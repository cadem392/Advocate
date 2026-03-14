import { AnalysisResult, AttackTree, DraftDocument, StructuredFacts } from "@/lib/types";

function matchFirst(text: string, patterns: RegExp[], fallback = "unknown") {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.trim();
    if (value) return value;
  }
  return fallback;
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function cleanLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function sanitizePersonName(value: string) {
  const trimmed = cleanLine(value)
    .split(/\b(?:Dear|Claim|Denied|Date of Service|Appeals Department|We have completed|submitted on your behalf)\b/i)[0]
    .split(/\d{2,}/)[0]
    .trim();

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  return tokens.slice(0, 4).join(" ").trim() || "unknown";
}

function parseCurrency(text: string, fallback = "$0.00") {
  const match = text.match(/\$[\d,]+(?:\.\d{2})?/);
  return match?.[0] || fallback;
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function toNumber(value: string) {
  return Number(value.replace(/[^0-9.-]/g, "")) || 0;
}

function shortDenialLabel(reason: string) {
  const compact = cleanLine(reason.replace(/^not /i, "Not "));
  if (compact.length <= 58) return compact;
  return `${compact.slice(0, 55).trim()}...`;
}

function inferInsurer(text: string) {
  const explicit = matchFirst(text, [
    /(?:Insurance Provider|Insurer)\s*:\s*(.+)/i,
    /(?:Carrier|Plan)\s*:\s*(.+)/i,
    /^(.+?)\s+CLAIM DETERMINATION NOTICE/i,
    /^(.+?)\s+NOTICE OF (?:ADVERSE BENEFIT DETERMINATION|CLAIM DENIAL)/i,
  ]);
  if (explicit !== "unknown") return explicit;

  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);
  const uppercaseLine = lines.find((line) => /^[A-Z0-9 .&'-]{4,}$/.test(line) && line.length < 60);
  return uppercaseLine ? toTitleCase(uppercaseLine) : "Unknown insurer";
}

function inferPatientName(text: string) {
  const raw = matchFirst(text, [
    /Member Name\s*:\s*(.+?)(?=\s+(?:Member ID|Policy Number|Group Number|Claim Number|Date of Service|Service Requested|Decision|Reason for Denial|Estimated Member Responsibility|Appeal Rights|Supporting Records|$))/i,
    /Patient Name\s*:\s*(.+?)(?=\s+(?:Member ID|Policy Number|Group Number|Claim Number|Date of Service|Service Requested|Decision|Reason for Denial|Estimated Member Responsibility|Appeal Rights|Supporting Records|$))/i,
    /Member\s*:\s*(.+?)(?=\s+(?:Member ID|Policy Number|Group Number|Claim Number|Date of Service|Service Requested|Decision|Reason for Denial|Estimated Member Responsibility|Appeal Rights|Supporting Records|$))/i,
    /Patient\s*:\s*(.+?)(?=\s+(?:Member ID|Policy Number|Group Number|Claim Number|Date of Service|Service Requested|Decision|Reason for Denial|Estimated Member Responsibility|Appeal Rights|Supporting Records|$))/i,
  ]);
  return raw === "unknown" ? raw : sanitizePersonName(raw);
}

function inferClaimNumber(text: string) {
  return matchFirst(text, [
    /Claim Number\s*:\s*([A-Z0-9-]+)/i,
    /Claim #\s*:\s*([A-Z0-9-]+)/i,
    /Claim\s*#\s*([A-Z0-9-]+)/i,
  ]);
}

function inferPolicyNumber(text: string) {
  return matchFirst(text, [
    /Policy Number\s*:\s*([A-Z0-9-]+)/i,
    /Policy #\s*:\s*([A-Z0-9-]+)/i,
    /Group Number\s*:\s*([A-Z0-9-]+)/i,
  ]);
}

function inferDateOfService(text: string) {
  return matchFirst(text, [
    /Date of Service(?: Requested)?\s*:\s*([A-Za-z]+ \d{1,2}, \d{4})/i,
    /Date of Service(?: Requested)?\s*:\s*([0-9/.-]+)/i,
  ]);
}

function inferNoticeDate(text: string) {
  return matchFirst(text, [
    /^Date\s*:\s*([A-Za-z]+ \d{1,2}, \d{4})/im,
    /Date of Notice\s*:\s*([A-Za-z]+ \d{1,2}, \d{4})/i,
    /Date of Notice\s*:\s*([0-9/.-]+)/i,
  ]);
}

function normalizeLineItemStatus(value?: string): "paid" | "denied" | "pending" | "billed" {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "approved") return "paid";
  if (normalized === "denied") return "denied";
  if (normalized === "pending") return "pending";
  if (normalized === "paid") return "paid";
  return "billed";
}

function inferDeniedAmount(
  text: string,
  lineItems: StructuredFacts["lineItems"] = []
) {
  const direct = matchFirst(text, [
    /Denied Amount\s*:\s*(\$[\d,]+(?:\.\d{2})?)/i,
    /Estimated Member Responsibility\s*:\s*(\$[\d,]+(?:\.\d{2})?)/i,
    /Patient Responsibility\s*:\s*(\$[\d,]+(?:\.\d{2})?)/i,
  ]);
  if (direct !== "unknown") return direct;

  const deniedTotal = lineItems
    .filter((item) => item.status === "denied")
    .reduce((sum, item) => sum + toNumber(item.amount), 0);
  if (deniedTotal > 0) return formatCurrency(deniedTotal);

  return parseCurrency(text);
}

function inferTotalBilled(
  text: string,
  deniedAmount: string,
  lineItems: StructuredFacts["lineItems"] = []
) {
  const direct = matchFirst(text, [
    /Total Charges\s*:\s*(\$[\d,]+(?:\.\d{2})?)/i,
    /Total Billed\s*:\s*(\$[\d,]+(?:\.\d{2})?)/i,
  ]);
  if (direct !== "unknown") return direct;

  const billedTotal = lineItems.reduce((sum, item) => sum + toNumber(item.amount), 0);
  if (billedTotal > 0) return formatCurrency(billedTotal);

  return deniedAmount;
}

function inferDenialReason(text: string) {
  const direct = matchFirst(text, [
    /Reason for Denial\s*:\s*([\s\S]*?)(?:\n[A-Z][A-Za-z ]+?:|\nEstimated|\nYour Appeal Rights|\nHow to Appeal|$)/i,
    /Denial Reason\s*:\s*(.+)/i,
    /Reason Code:[^\n]*[—:-]\s*["“]?([^"\n]+)["”]?/i,
  ]);
  if (direct !== "unknown") return cleanLine(direct);

  if (/medical necessity/i.test(text)) {
    return "Medical necessity criteria not met.";
  }
  if (/prior authorization/i.test(text)) {
    return "Prior authorization requirement cited by insurer.";
  }
  return "Coverage denied by insurer.";
}

function inferDenialCode(text: string) {
  return matchFirst(text, [
    /Reason Code\s*:\s*([A-Z0-9-]+)/i,
    /Denial Code\s*:\s*([A-Z0-9-]+)/i,
  ]);
}

function inferAppealDeadlineDays(text: string) {
  const match = text.match(/(?:appeal|internal appeal)[^.]*?within\s+(\d{1,3})\s+(?:calendar\s+)?days/i);
  return match ? Number(match[1]) : 180;
}

function parseLineItems(text: string): StructuredFacts["lineItems"] {
  const items: StructuredFacts["lineItems"] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = cleanLine(rawLine);
    const match = line.match(
      /^(?:\d+\.\s*)?(.+?)\s*-\s*(?:CPT|HCPCS)\s*([A-Z0-9]+).*?(\$[\d,]+(?:\.\d{2})?)(?:.*\b(DENIED|PAID|PENDING|BILLED)\b)?/i
    );
    if (!match) continue;

    items.push({
      description: cleanLine(match[1]),
      cptCode: match[2],
      amount: match[3],
      status: normalizeLineItemStatus(match[4]),
    });
  }

  const compactText = text.replace(/\s+/g, " ").trim();
  const tableSection =
    compactText.match(
      /Services Reviewed\s+CPT Code\s+Description\s+Billed Amount\s+Determination\s+([\s\S]+?)(?=\s+Reason for Denial|\s+Denial Code|\s+Your Right to Appeal|\s+Appeal Rights|\s+If you have questions|\s+BlueCross HealthPlan complies|\s*$)/i
    )?.[1] || compactText;
  const tablePattern =
    /(?:^|\s)(\d{5}[A-Z]?)\s+(.+?)\s+(\$[\d,]+(?:\.\d{2})?)\s+(Denied|Approved|Pending|Billed)(?=\s+\d{5}[A-Z]?\s+|\s+Reason for Denial|\s+Denial Code|\s+Your Right to Appeal|\s+Appeal Rights|\s+If you have questions|\s+BlueCross HealthPlan complies|\s*$)/gi;

  for (const match of Array.from(tableSection.matchAll(tablePattern))) {
    items.push({
      description: cleanLine(match[2]).replace(/^Description\s+/i, ""),
      cptCode: match[1],
      amount: match[3],
      status: normalizeLineItemStatus(match[4]),
    });
  }

  const deduped = items.filter((item, index, array) => {
    const signature = `${item.cptCode}|${item.description}|${item.amount}|${item.status}`;
    return array.findIndex((candidate) => {
      return `${candidate.cptCode}|${candidate.description}|${candidate.amount}|${candidate.status}` === signature;
    }) === index;
  });

  return deduped.slice(0, 12);
}

function detectBillingErrors(facts: StructuredFacts, documentText: string): AnalysisResult["billingErrors"] {
  const errors: AnalysisResult["billingErrors"] = [];
  const seenByCode = new Map<string, StructuredFacts["lineItems"][number]>();

  for (const item of facts.lineItems) {
    const prior = seenByCode.get(item.cptCode);
    if (prior && prior.description === item.description && prior.amount === item.amount) {
      errors.push({
        id: `duplicate-${item.cptCode}`,
        type: "duplicate",
        description: `${item.description} appears more than once for the same case.`,
        originalCharge: item.amount,
        estimatedOvercharge: item.amount,
        cptCode: item.cptCode,
        evidence: `Duplicate CPT ${item.cptCode} line items were found in the submitted case file.`,
      });
    } else {
      seenByCode.set(item.cptCode, item);
    }
  }

  if (/70553/i.test(documentText) && /70551/i.test(documentText)) {
    errors.push({
      id: "coding-mri-contrast",
      type: "wrong_code",
      description: "The case references multiple MRI procedure codes, which may indicate a coding inconsistency.",
      originalCharge: facts.deniedAmount,
      estimatedOvercharge: facts.deniedAmount,
      cptCode: "70553/70551",
      evidence: "Both MRI code variants appear in the document text.",
    });
  }

  return errors.slice(0, 4);
}

function buildAppealGrounds(facts: StructuredFacts, text: string, billingErrors: AnalysisResult["billingErrors"]) {
  const grounds: AnalysisResult["appealGrounds"] = [];
  const lower = text.toLowerCase();

  if (/medical necessity/.test(lower)) {
    grounds.push({
      id: "ground-medical-necessity",
      basis: "medical_necessity",
      argument:
        "The denial relies on medical necessity criteria. The appeal should focus on documented symptoms, failed conservative treatment, and provider rationale supporting the requested service.",
      strength: /physical therapy|provider|physician|clinical/.test(lower) ? "strong" : "moderate",
      regulation: undefined,
    });
  }

  if (/prior authorization|authorization required|plan section|coverage|benefit plan/.test(lower)) {
    grounds.push({
      id: "ground-coverage-terms",
      basis: "coverage_terms",
      argument:
        "The file references plan language or prior-authorization rules, so the appeal should test whether the insurer applied the correct coverage standard and section.",
      strength: "moderate",
      regulation: undefined,
    });
  }

  if (billingErrors.length) {
    grounds.push({
      id: "ground-billing-error",
      basis: "billing_error",
      argument:
        "The case file contains coding or duplicate-charge signals that should be disputed separately from the denial rationale.",
      strength: "moderate",
      regulation: undefined,
    });
  }

  if (!grounds.length) {
    grounds.push({
      id: "ground-general-review",
      basis: "regulatory",
      argument:
        "The denial should be challenged through internal appeal, requesting the full reviewer rationale, supporting policy language, and any missing utilization-review details.",
      strength: "moderate",
      regulation: undefined,
    });
  }

  return grounds.slice(0, 4);
}

function buildDeadlines(facts: StructuredFacts, text: string): AnalysisResult["deadlines"] {
  const deadlines: AnalysisResult["deadlines"] = [];
  const noticeDate = inferNoticeDate(text);
  const appealDays = facts.appealDeadlineDays || 180;
  const serviceDate = facts.dateOfService !== "unknown" ? facts.dateOfService : "the notice date";

  deadlines.push({
    id: "deadline-internal-appeal",
    action: "File internal appeal",
    date: noticeDate !== "unknown" ? `Within ${appealDays} days of ${noticeDate}` : `Within ${appealDays} days of notice`,
    daysRemaining: appealDays,
    consequence: `Missing the internal appeal window can lock in responsibility for ${facts.deniedAmount}.`,
    urgency: appealDays <= 30 ? "critical" : appealDays <= 60 ? "high" : "medium",
  });

  if (/external review/.test(text.toLowerCase())) {
    deadlines.push({
      id: "deadline-external-review",
      action: "Prepare external review fallback",
      date: "If the internal appeal is denied",
      daysRemaining: Math.max(30, Math.floor(appealDays / 3)),
      consequence: "Delaying escalation can narrow the independent review path.",
      urgency: "medium",
    });
  }

  deadlines.push({
    id: "deadline-evidence",
    action: "Collect supporting records",
    date: `Before the appeal packet is finalized for ${serviceDate}`,
    daysRemaining: Math.max(7, Math.min(21, Math.floor(appealDays / 4))),
    consequence: "Missing provider notes or policy support weakens the appeal narrative.",
    urgency: "high",
  });

  return deadlines.slice(0, 3);
}

export function heuristicStructure(documentText: string): StructuredFacts {
  const insurer = inferInsurer(documentText);
  const patientName = inferPatientName(documentText);
  const claimNumber = inferClaimNumber(documentText);
  const policyNumber = inferPolicyNumber(documentText);
  const dateOfService = inferDateOfService(documentText);
  const lineItems = parseLineItems(documentText);
  const deniedAmount = inferDeniedAmount(documentText, lineItems);
  const totalBilled = inferTotalBilled(documentText, deniedAmount, lineItems);
  const denialReason = inferDenialReason(documentText);
  const denialCode = inferDenialCode(documentText);
  const appealDeadlineDays = inferAppealDeadlineDays(documentText);

  return {
    patientName,
    insurer,
    policyNumber,
    claimNumber,
    dateOfService,
    totalBilled,
    deniedAmount,
    denialReason,
    denialCode,
    appealDeadlineDays,
    lineItems,
    rawSummary: `${patientName !== "unknown" ? patientName : "The member"} has a denied claim with ${insurer}. Main issue: ${shortDenialLabel(denialReason)}`,
  };
}

export function heuristicAnalyze(documentText: string, facts: StructuredFacts): AnalysisResult {
  const billingErrors = detectBillingErrors(facts, documentText);
  const appealGrounds = buildAppealGrounds(facts, documentText, billingErrors);
  const deadlines = buildDeadlines(facts, documentText);
  const deniedAmountValue = toNumber(facts.deniedAmount);
  const totalBilledValue = toNumber(facts.totalBilled);

  const riskLevel: AnalysisResult["riskLevel"] =
    deadlines[0]?.daysRemaining <= 30
      ? "critical"
      : deniedAmountValue >= 10000
        ? "high"
        : deniedAmountValue >= 3000
          ? "medium"
          : "low";

  return {
    summary: `${facts.patientName !== "unknown" ? facts.patientName : "The member"} has a claim denied by ${facts.insurer}. The current denial reason is ${shortDenialLabel(facts.denialReason)}${billingErrors.length ? ` ${billingErrors.length} billing or coding issue(s) were also detected.` : ""}`,
    totalBilled: facts.totalBilled,
    totalOvercharged:
      billingErrors.length > 0
        ? `$${billingErrors.reduce((sum, error) => sum + toNumber(error.estimatedOvercharge), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "$0.00",
    deniedAmount: facts.deniedAmount || `$${deniedAmountValue.toFixed(2)}`,
    billingErrors,
    appealGrounds,
    deadlines,
    riskLevel,
    patientContext: `${facts.patientName !== "unknown" ? facts.patientName : "Patient"} | ${facts.dateOfService !== "unknown" ? facts.dateOfService : "service date pending"} | billed ${totalBilledValue ? facts.totalBilled : "amount pending"}`,
  };
}

export function heuristicStrategy(
  analysis: AnalysisResult,
  facts?: StructuredFacts
): AttackTree {
  const denialLabel = shortDenialLabel(facts?.denialReason || analysis.summary);
  const hasBillingError = analysis.billingErrors.length > 0;
  const missingClinicalSupport = analysis.appealGrounds.some((ground) => ground.basis === "medical_necessity");
  const primaryActionLabel = hasBillingError ? "File Internal Appeal" : "Prepare Internal Appeal";
  const evidenceLabel = missingClinicalSupport ? "Provider Support Needed" : "Policy Support Needed";
  const deadlineLabel = analysis.deadlines[0]
    ? `${analysis.deadlines[0].daysRemaining} Days Left`
    : "Deadline Review";

  const nodes: AttackTree["nodes"] = [
    {
      id: "node-denial-action",
      type: "action",
      label: primaryActionLabel,
      description: `Build the first appeal package against: ${denialLabel}`,
      urgency: "immediate",
      status: "ready",
      documentType: "appeal_letter",
    },
    {
      id: "node-evidence",
      type: "evidence",
      label: evidenceLabel,
      description: missingClinicalSupport
        ? "Collect provider notes, therapy history, and clinical rationale to strengthen medical necessity."
        : "Collect coverage language, policy sections, and insurer criteria tied to the denial.",
      urgency: "this_week",
      status: "ready",
    },
    {
      id: "node-document",
      type: "document",
      label: "Appeal Draft",
      description: "Generate the next formal document with the strongest current grounds and evidence.",
      urgency: "this_week",
      status: "ready",
      documentType: "appeal_letter",
    },
    {
      id: "node-deadline",
      type: "deadline",
      label: deadlineLabel,
      description: analysis.deadlines[0]?.consequence || "Monitor the primary filing deadline.",
      urgency: "this_week",
      status: "ready",
    },
    {
      id: "node-escalation",
      type: "escalation",
      label: "External Review",
      description: "Escalate if the internal appeal is denied or the insurer maintains the current rationale.",
      urgency: "this_month",
      status: "optional",
      documentType: "external_review",
    },
    {
      id: "node-outcome",
      type: "outcome",
      label: "Coverage Restored",
      description: "Best-case path: the denial is overturned or materially reduced after review.",
      urgency: "this_month",
      status: "optional",
    },
  ];

  if (hasBillingError) {
    nodes.push({
      id: "node-billing",
      type: "action",
      label: "Dispute Billing Error",
      description: "Separate coding or duplicate-charge issues from the denial and request correction in parallel.",
      urgency: "immediate",
      status: "ready",
    });
  }

  const edges: AttackTree["edges"] = [
    { id: "edge-evidence-action", source: "node-evidence", target: "node-denial-action", label: "supports", type: "sequence" },
    { id: "edge-action-document", source: "node-denial-action", target: "node-document", label: "draft", type: "sequence" },
    { id: "edge-document-deadline", source: "node-document", target: "node-deadline", label: "before filing", type: "sequence" },
    { id: "edge-document-escalation", source: "node-document", target: "node-escalation", label: "if denied", type: "fallback" },
    { id: "edge-escalation-outcome", source: "node-escalation", target: "node-outcome", label: "if successful", type: "sequence" },
  ];

  if (hasBillingError) {
    edges.push({
      id: "edge-billing-outcome",
      source: "node-billing",
      target: "node-outcome",
      label: "parallel recovery",
      type: "parallel",
    });
  }

  return {
    nodes,
    edges,
    reasoning: `The strategy prioritizes ${primaryActionLabel.toLowerCase()} first, while gathering the evidence needed to rebut ${denialLabel.toLowerCase()}. External review remains the fallback if the internal appeal does not resolve the case.`,
  };
}

export function heuristicDraft(
  request: {
    nodeLabel: string;
    nodeDescription: string;
    analysis: AnalysisResult;
    structuredFacts?: StructuredFacts;
    documentType?: string;
  }
): DraftDocument {
  const facts = request.structuredFacts;
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const grounds = request.analysis.appealGrounds.slice(0, 3);
  const deniedServices = (facts?.lineItems || []).filter((item) => item.status === "denied");
  const serviceSection = deniedServices.length
    ? deniedServices
        .map(
          (item) =>
            `- ${item.description} (CPT ${item.cptCode}) — ${item.amount}`
        )
        .join("\n")
    : "- Please review the denied service lines referenced in the claim determination notice.";
  const firstDeadline = request.analysis.deadlines[0];
  const numberedGrounds = grounds
    .map(
      (ground, index) =>
        `${index + 1}. ${ground.basis.replace(/_/g, " ").toUpperCase()}\n${ground.argument}`
    )
    .join("\n\n");

  const content = `[YOUR NAME]
[YOUR ADDRESS]
[CITY, STATE ZIP]
[EMAIL ADDRESS]
[PHONE NUMBER]

${today}

${facts?.insurer || "Insurer"} Appeals Department
[RECIPIENT ADDRESS]

RE: ${request.nodeLabel}
Claim Number: ${facts?.claimNumber || "[CLAIM NUMBER]"}
Policy Number: ${facts?.policyNumber || "[POLICY NUMBER]"}
Member: ${facts?.patientName || "[MEMBER NAME]"}
Date of Service: ${facts?.dateOfService || "[DATE OF SERVICE]"}
Denied Amount: ${request.analysis.deniedAmount}
${facts?.denialCode && facts.denialCode !== "unknown" ? `Denial Code: ${facts.denialCode}` : ""}

Dear Appeals Review Board:

Please accept this correspondence as a timely internal appeal of the denial associated with the above-referenced claim. I request full reconsideration of the adverse benefit determination and a written explanation of any clinical or policy basis relied upon to maintain the denial.

The current denial rationale states: ${facts?.denialReason || request.analysis.summary}

Denied services under review:
${serviceSection}

This appeal should be granted for the following reasons:

${numberedGrounds || "1. ADDITIONAL REVIEW REQUESTED\n\nThe denial should be reconsidered using the full clinical and coverage record."}

Requested action:
1. Overturn the denial and authorize payment for the denied services listed above.
2. Confirm the precise clinical criteria, policy provisions, and reviewer rationale applied to this claim.
3. Preserve all internal appeal and external review rights if the denial is not fully reversed.

${firstDeadline ? `Please treat this matter as time-sensitive and process it within the applicable review window. The current case deadline is ${firstDeadline.date}.` : "Please treat this matter as time-sensitive and process it within the applicable review window."}

If additional documentation is required, please identify each missing item with specificity so the record can be supplemented without delay.

Sincerely,

[YOUR NAME]
[YOUR CONTACT INFORMATION]`;

  return {
    type: request.documentType || "appeal_letter",
    title: request.nodeLabel,
    content,
    keyPoints: grounds.map((ground) => ground.argument).slice(0, 3),
  };
}
