from __future__ import annotations

import os
from typing import Optional, Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field


app = FastAPI(title="Advocate Inference Service", version="0.1.0")


class AppealRiskRequest(BaseModel):
    insurance_type: Optional[str] = None
    claim_type: Optional[str] = None
    diagnosis_chapter: Optional[str] = None
    denial_reason: Optional[str] = None
    provider_type: Optional[str] = None
    numeric_features: dict[str, float] = Field(default_factory=dict)


class AppealRiskResponse(BaseModel):
    risk_score: float
    source: Literal["model_service", "heuristic"]
    feature_contract_complete: bool
    warning: Optional[str] = None


class BranchViabilityRequest(BaseModel):
    issue_class: str
    branch_type: str
    evidence_score: float
    case_similarity: float
    jurisdiction: str


class BranchViabilityResponse(BaseModel):
    branchTemplateId: str
    branchId: str
    viabilityScore: float
    favorableOutcomeProbability: float
    escalationLevel: Literal["low", "medium", "high"]
    confidence: float
    source: Literal["model_service", "heuristic"]


class BlindSpotRequest(BaseModel):
    text: str


class BlindSpotResponse(BaseModel):
    primaryLabel: str
    primaryScore: float
    secondaryLabel: Optional[str] = None
    secondaryScore: Optional[float] = None
    matchedText: Optional[str] = None
    source: Literal["model_service", "heuristic"]


class EvidenceRelevanceRequest(BaseModel):
    label: str
    snippet: str
    source_type: str
    missing: bool = False
    analysis_summary: Optional[str] = None
    denial_reason: Optional[str] = None
    patient_context: Optional[str] = None
    insurer: Optional[str] = None
    appeal_grounds: list[str] = Field(default_factory=list)
    target_node_label: Optional[str] = None
    target_node_type: Optional[str] = None


class EvidenceRelevanceResponse(BaseModel):
    relevance_score: float
    confidence: float
    source: Literal["model_service", "heuristic"]
    reasoning: str
    evidence_score: Optional[float] = None
    case_similarity: Optional[float] = None


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def _heuristic_appeal_risk(payload: AppealRiskRequest) -> AppealRiskResponse:
    score = 0.35
    denial = (payload.denial_reason or "").lower()
    claim = (payload.claim_type or "").lower()
    provider = (payload.provider_type or "").lower()
    numeric = payload.numeric_features

    if "medical necessity" in denial:
        score += 0.18
    if "authorization" in denial:
        score += 0.12
    if "timely filing" in denial:
        score += 0.20
    if "inpatient" in claim:
        score += 0.10
    if "mental" in claim:
        score += 0.06
    if "hospital" in provider:
        score += 0.04

    denied_amount = numeric.get("deniedAmount", numeric.get("denied_amount", 0.0))
    days_to_deadline = numeric.get("daysToDeadline", numeric.get("days_to_deadline", 0.0))
    evidence_score = numeric.get("evidenceScore", numeric.get("evidence_score", 0.0))

    score += _clamp(denied_amount / 20000.0, 0.0, 0.18)
    if days_to_deadline > 0:
        score += _clamp((30.0 - min(days_to_deadline, 30.0)) / 30.0, 0.0, 0.14)
    score -= _clamp(evidence_score * 0.18, 0.0, 0.18)

    return AppealRiskResponse(
        risk_score=round(_clamp(score), 2),
        source="heuristic",
        feature_contract_complete=False,
        warning="Heuristic fallback in use until the serialized appeal risk model feature registry is finalized.",
    )


def _heuristic_branch_viability(payload: BranchViabilityRequest) -> BranchViabilityResponse:
    viability = payload.evidence_score * 0.55 + payload.case_similarity * 0.3
    favorable = viability * 0.92
    branch_type = payload.branch_type.lower()
    issue_class = payload.issue_class.lower()
    jurisdiction = payload.jurisdiction.lower()

    if "internal appeal" in branch_type:
      viability += 0.08
    if "external review" in branch_type:
      viability -= 0.04
    if "complaint" in branch_type:
      favorable -= 0.06
    if "insurance" in issue_class:
      viability += 0.05
    if "medical necessity" in issue_class:
      viability += 0.04
    if "ca" in jurisdiction or "ninth" in jurisdiction:
      favorable += 0.03

    escalation = "medium"
    if viability < 0.4:
      escalation = "high"
    elif viability > 0.72:
      escalation = "low"

    return BranchViabilityResponse(
        branchTemplateId=payload.branch_type,
        branchId=payload.branch_type,
        viabilityScore=round(_clamp(viability), 2),
        favorableOutcomeProbability=round(_clamp(favorable), 2),
        escalationLevel=escalation,
        confidence=round(_clamp(0.55 + payload.case_similarity * 0.25), 2),
        source="heuristic",
    )


def _heuristic_blindspot(payload: BlindSpotRequest) -> BlindSpotResponse:
    text = payload.text.lower()
    if "prior authorization" in text and ("emergency" in text or "er " in text):
        return BlindSpotResponse(
            primaryLabel="emergency exception conflict",
            primaryScore=0.86,
            secondaryLabel="coverage terms mismatch",
            secondaryScore=0.62,
            matchedText="prior authorization + emergency encounter",
            source="heuristic",
        )
    if "medical necessity" in text and ("physician" in text or "clinical" in text):
        return BlindSpotResponse(
            primaryLabel="medical necessity gap",
            primaryScore=0.78,
            secondaryLabel="missing clinician support",
            secondaryScore=0.55,
            matchedText="medical necessity + clinical evidence references",
            source="heuristic",
        )
    if "70553" in text and "70551" in text:
        return BlindSpotResponse(
            primaryLabel="coding inconsistency",
            primaryScore=0.81,
            secondaryLabel="billing discrepancy",
            secondaryScore=0.57,
            matchedText="multiple MRI CPT codes detected",
            source="heuristic",
        )
    return BlindSpotResponse(
        primaryLabel="no material conflict detected",
        primaryScore=0.49,
        source="heuristic",
    )


def _tokenize(value: str) -> set[str]:
    return {token for token in __import__("re").split(r"[^a-z0-9]+", value.lower()) if token}


def _jaccard(left: str, right: str) -> float:
    left_tokens = _tokenize(left)
    right_tokens = _tokenize(right)
    if not left_tokens or not right_tokens:
        return 0.0
    union = left_tokens | right_tokens
    return len(left_tokens & right_tokens) / len(union) if union else 0.0


def _heuristic_evidence_relevance(payload: EvidenceRelevanceRequest) -> EvidenceRelevanceResponse:
    lower = f"{payload.label} {payload.snippet}".lower()
    context = " ".join(
        [
            payload.analysis_summary or "",
            payload.denial_reason or "",
            payload.patient_context or "",
            payload.insurer or "",
            " ".join(payload.appeal_grounds),
            payload.target_node_label or "",
            payload.target_node_type or "",
        ]
    )
    similarity = _jaccard(lower, context.lower())

    evidence_score = 0.35
    if payload.source_type == "provider_note":
        evidence_score += 0.22
    if payload.source_type == "regulation":
        evidence_score += 0.18
    if payload.source_type == "policy_excerpt":
        evidence_score += 0.16
    if payload.source_type == "derived_signal":
        evidence_score += 0.14
    if payload.source_type == "uploaded_file":
        evidence_score += 0.08
    if payload.missing:
        evidence_score -= 0.30

    denial_reason = (payload.denial_reason or "").lower()
    node_label = (payload.target_node_label or "").lower()

    if "medical necessity" in lower and "medical necessity" in denial_reason:
        evidence_score += 0.18
    if "prior authorization" in lower and "authorization" in denial_reason:
        evidence_score += 0.16
    if "emergency" in lower and "authorization" in denial_reason:
        evidence_score += 0.14
    if any(char.isdigit() for char in lower) and "billing" in node_label:
        evidence_score += 0.15
    if "appeal" in node_label and ("physician" in lower or "clinical" in lower):
        evidence_score += 0.12

    blended = _clamp(evidence_score * 0.6 + similarity * 0.4)
    reasoning = [f"source={payload.source_type}", f"similarity={similarity:.2f}"]
    if "medical necessity" in lower:
        reasoning.append("medical-necessity match")
    if "authorization" in lower:
        reasoning.append("authorization match")
    if any(char.isdigit() for char in lower):
        reasoning.append("code/token match")

    return EvidenceRelevanceResponse(
        relevance_score=round(blended, 2),
        confidence=round(_clamp(0.58 + similarity * 0.25), 2),
        source="heuristic",
        reasoning=", ".join(reasoning),
        evidence_score=round(_clamp(evidence_score), 2),
        case_similarity=round(similarity, 2),
    )


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "artifact_dir": os.environ.get("MODEL_ARTIFACT_DIR", "")}


@app.post("/predict/appeal-risk", response_model=AppealRiskResponse)
def predict_appeal_risk(payload: AppealRiskRequest) -> AppealRiskResponse:
    return _heuristic_appeal_risk(payload)


@app.post("/predict/branch-viability", response_model=BranchViabilityResponse)
def predict_branch_viability(payload: BranchViabilityRequest) -> BranchViabilityResponse:
    return _heuristic_branch_viability(payload)


@app.post("/analyze/blindspot", response_model=BlindSpotResponse)
def analyze_blindspot(payload: BlindSpotRequest) -> BlindSpotResponse:
    return _heuristic_blindspot(payload)


@app.post("/score/evidence-relevance", response_model=EvidenceRelevanceResponse)
def score_evidence_relevance(payload: EvidenceRelevanceRequest) -> EvidenceRelevanceResponse:
    return _heuristic_evidence_relevance(payload)
