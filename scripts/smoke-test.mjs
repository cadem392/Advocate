const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";

const SAMPLE_CASE = `BlueCross HealthPlan CLAIM DETERMINATION NOTICE 1200 Insurance Plaza, Suite 800 | Chicago, IL 60601 | Member Services: 1-800-555-0192 Date of Notice: March 14, 2025 Claim Number: CLM-2025-00847391 Member ID: BCH-7741829-04 Group Number: GRP-00041-IL Date of Service: February 28, 2025 Provider: Northwestern Medical Center Member: Jordan M. Rivera 4421 Maple Street, Apt 3B Evanston, IL 60201 CLAIM DENIED Dear Jordan Rivera, We have completed our review of the above-referenced claim submitted on your behalf by Northwestern Medical Center. After careful evaluation, we have determined that the services described below do not meet the criteria for coverage under your BlueCross HealthPlan Premier PPO policy (Plan ID: PPO-IL-4400). This notice serves as our formal denial determination. Services Reviewed CPT Code Description Billed Amount Determination 27447 Total knee arthroplasty (right) $34,200.00 Denied 99213 Office/outpatient visit, established $185.00 Approved 97110 Therapeutic exercises (post-op) $420.00 Denied Reason for Denial Denial Code: MN-001 — Medical Necessity Not Established Based on our review of the submitted clinical documentation, we have determined that the requested procedure (total knee arthroplasty, CPT 27447) does not meet the medical necessity criteria established under BlueCross HealthPlan Clinical Policy Bulletin CP-0366. Specifically, the submitted records do not demonstrate: Failure of at least 6 months of conservative non-surgical treatment, including physical therapy and anti-inflammatory medications Radiographic evidence of severe joint space narrowing (Kellgren-Lawrence Grade III or IV) with corresponding functional impairment Documentation of significant limitations in activities of daily living that are directly attributable to the knee condition The denial of post-operative physical therapy (CPT 97110) follows directly from the denial of the primary procedure. Your Right to Appeal You have the right to appeal this determination. Appeals must be submitted in writing within 180 days of the date of this notice. Please include your member ID, claim number, and any additional clinical documentation supporting medical necessity.`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  return { response, body };
}

async function postJSON(path, payload) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function main() {
  for (const path of ["/", "/workspace", "/evidence", "/draft", "/confirmation", "/status", "/dashboard"]) {
    const { response } = await request(path);
    assert(response.ok, `GET ${path} failed with ${response.status}`);
  }

  const structure = await postJSON("/api/structure", {
    documentText: SAMPLE_CASE,
    useSampleMode: false,
  });
  assert(structure.response.ok, "Structure request failed");
  assert(structure.body.deniedAmount === "$34,620.00", "Denied amount did not sum denied lines");

  const analyze = await postJSON("/api/analyze", {
    documentText: SAMPLE_CASE,
    structuredFacts: structure.body,
    useSampleMode: false,
  });
  assert(analyze.response.ok, "Analyze request failed");

  const strategy = await postJSON("/api/strategy", {
    analysis: analyze.body,
    structuredFacts: structure.body,
    useSampleMode: false,
  });
  assert(strategy.response.ok, "Strategy request failed");
  assert(Array.isArray(strategy.body.nodes) && strategy.body.nodes.length > 0, "Strategy returned no nodes");

  const draftNode = strategy.body.nodes.find((node) => node.documentType) || strategy.body.nodes[0];
  const draft = await postJSON("/api/draft", {
    nodeLabel: draftNode.label,
    nodeDescription: draftNode.description,
    documentType: draftNode.documentType,
    analysis: analyze.body,
    structuredFacts: structure.body,
    useSampleMode: false,
  });
  assert(draft.response.ok, "Draft request failed");
  assert(String(draft.body.content || "").includes("Claim Number: CLM-2025-00847391"), "Draft content missing claim details");

  const badStructure = await postJSON("/api/structure", { documentText: "" });
  assert(badStructure.response.status === 400, "Empty structure request should return 400");

  const badStrategy = await postJSON("/api/strategy", {});
  assert(badStrategy.response.status === 400, "Missing strategy request should return 400");

  const badDraft = await postJSON("/api/draft", {});
  assert(badDraft.response.status === 400, "Missing draft request should return 400");

  const badEvidenceScore = await postJSON("/api/models/evidence-relevance", {});
  assert(badEvidenceScore.response.status === 400, "Missing evidence relevance payload should return 400");

  const relevantEvidence = await postJSON("/api/models/evidence-relevance", {
    label: "medical_necessity.pdf",
    snippet:
      "Treating physician progress note: patient completed physical therapy and anti-inflammatory treatment without improvement. Persistent pain, reduced range of motion, and clinical concern for structural injury support medical necessity for MRI.",
    sourceType: "provider_note",
    analysisSummary: "Claim denied for medical necessity after failed conservative treatment.",
    denialReason: "Medical necessity not established",
    patientContext: "Lumbar MRI request after persistent symptoms.",
    insurer: "BlueCross HealthPlan",
    appealGrounds: [
      "medical_necessity provider rationale needed",
      "coverage_terms policy bulletin conflict",
    ],
    issueClass: "medical_necessity coverage_terms",
    branchType: "Provider Support Needed",
    targetNodeLabel: "Provider Support Needed",
    targetNodeType: "evidence",
  });
  assert(relevantEvidence.response.ok, "Relevant evidence request failed");

  const irrelevantEvidence = await postJSON("/api/models/evidence-relevance", {
    label: "dashboard-export.html",
    snippet:
      "<!DOCTYPE html><html><body><div class=\"layout\">linked-user-flow workspace support confirmation status-tracker</div></body></html>",
    sourceType: "uploaded_file",
    analysisSummary: "Claim denied for medical necessity after failed conservative treatment.",
    denialReason: "Medical necessity not established",
    patientContext: "Lumbar MRI request after persistent symptoms.",
    insurer: "BlueCross HealthPlan",
    appealGrounds: [
      "medical_necessity provider rationale needed",
      "coverage_terms policy bulletin conflict",
    ],
    issueClass: "medical_necessity coverage_terms",
    branchType: "Provider Support Needed",
    targetNodeLabel: "Provider Support Needed",
    targetNodeType: "evidence",
  });
  assert(irrelevantEvidence.response.ok, "Irrelevant evidence request failed");
  assert(
    relevantEvidence.body.relevanceScore > irrelevantEvidence.body.relevanceScore,
    "Relevant medical evidence should outrank irrelevant exports"
  );

  const formData = new FormData();
  formData.append(
    "file",
    new Blob(
      [
        "Treating provider note. Medical necessity documented after conservative treatment failed. Claim number CLM-TEST-1001.",
      ],
      { type: "text/plain" }
    ),
    "provider-note.txt"
  );
  const ingestion = await request("/api/evidence/ingest", {
    method: "POST",
    body: formData,
  });
  assert(ingestion.response.ok, "Evidence ingest request failed");
  assert(ingestion.body.previewUrl, "Evidence ingest should return a preview URL");

  const preview = await request(ingestion.body.previewUrl);
  assert(preview.response.ok, "Stored preview request failed");
  assert(
    String(preview.body).includes("Medical necessity documented"),
    "Stored preview should return uploaded document content"
  );

  console.log("Smoke test passed");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
