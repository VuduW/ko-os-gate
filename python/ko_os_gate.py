from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Mapping, Protocol


class GateResult(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"
    HUMAN_REVIEW = "HUMAN_REVIEW"


class ExecutionStatus(str, Enum):
    NOT_ATTEMPTED = "NOT_ATTEMPTED"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"


class EpistemicStatus(str, Enum):
    OBSERVED = "OBSERVED"
    DERIVED = "DERIVED"
    CLAIMED = "CLAIMED"
    INFERRED = "INFERRED"
    VERIFIED = "VERIFIED"
    UNKNOWN = "UNKNOWN"
    CONTRADICTED = "CONTRADICTED"


class EvidenceAdapter(Protocol):
    def to_evidence(self, raw: Mapping[str, Any]) -> "EvidenceResult": ...


@dataclass(frozen=True)
class EvidenceResult:
    subject: str
    claims: Mapping[str, Any]
    source: str
    observed_at: datetime
    issued_at: datetime
    expires_at: datetime
    validity: bool
    provenance: str
    epistemic_status: EpistemicStatus

    def is_temporally_valid(self, at: datetime) -> bool:
        return self.issued_at <= at <= self.expires_at


@dataclass(frozen=True)
class DictEvidenceAdapter:
    source_name: str

    def to_evidence(self, raw: Mapping[str, Any]) -> EvidenceResult:
        return EvidenceResult(
            subject=str(raw["subject"]),
            claims=dict(raw.get("claims", {})),
            source=self.source_name,
            observed_at=raw["observed_at"],
            issued_at=raw["issued_at"],
            expires_at=raw["expires_at"],
            validity=bool(raw["validity"]),
            provenance=str(raw.get("provenance", self.source_name)),
            epistemic_status=EpistemicStatus(raw.get("epistemic_status", EpistemicStatus.UNKNOWN.value)),
        )


@dataclass(frozen=True)
class AuthorityLease:
    subject: str
    scope: str
    purpose: str
    constraints: Mapping[str, Any]
    issued_at: datetime
    expires_at: datetime
    issuer: str

    def is_temporally_active(self, at: datetime) -> bool:
        return self.issued_at <= at <= self.expires_at

    def matches(self, subject: str, scope: str) -> bool:
        return self.subject == subject and self.scope == scope

    def satisfies_constraints(self, required_constraints: Mapping[str, Any]) -> bool:
        return all(self.constraints.get(key) == value for key, value in required_constraints.items())

    def is_valid(self, at: datetime, subject: str, scope: str) -> bool:
        return self.is_temporally_active(at) and self.matches(subject, scope)


@dataclass(frozen=True)
class Actor:
    id: str
    capabilities: frozenset[str]
    authority: tuple[AuthorityLease, ...] = ()


@dataclass(frozen=True)
class GateRequest:
    subject: str
    capability: str
    scope: str
    required_constraints: Mapping[str, Any] = field(default_factory=dict)
    policy_satisfied: bool = True
    conflict_mode: GateResult = GateResult.DENY


@dataclass(frozen=True)
class PackCharacter:
    name: str
    role: str
    function: str
    contribution: str


PACK_CHARACTERS: tuple[PackCharacter, ...] = (
    PackCharacter("QUILL", "Overseer/Coherence", "Coordinates constitutional consistency", "Checks whole-system coherence before decision"),
    PackCharacter("RUNE", "Systems Architect/Structure", "Shapes interfaces, contracts, and boundaries", "Keeps the gate contract structurally sound"),
    PackCharacter("ZYRA", "Crypto/Innovation", "Explores stronger technical evidence mechanisms", "Improves evidence quality without becoming authority"),
    PackCharacter("VERA", "Feasibility/Reality Check", "Tests viability against reality", "Challenges impractical assumptions in decisions"),
    PackCharacter("MAVEN", "Knowledge/Curation", "Curates context and retrieval", "Supplies knowledge inputs without minting authority"),
    PackCharacter("ARIA", "Meaning/Expression", "Turns system state into human-facing explanation", "Makes outcomes understandable"),
    PackCharacter("LYRA", "Human Intelligence/Context", "Maintains human-centered reasoning", "Protects usability and operator clarity"),
    PackCharacter("SOL", "Operations/Momentum", "Coordinates approved operational flow", "Moves allowed work toward runtime without granting permission"),
    PackCharacter("TALON", "Security/Adversarial", "Assumes hostile conditions and ambiguity", "Tests boundary failures and abuse cases"),
    PackCharacter("KAI", "Engineering/Implementation", "Builds the actual systems", "Turns contracts into executable implementations"),
    PackCharacter("SAGE", "Learning/Evaluation", "Evaluates patterns and feedback", "Improves models while respecting gate boundaries"),
    PackCharacter("NARA", "Strategy/Synthesis", "Connects present decisions to long-horizon outcomes", "Frames system trade-offs and opportunity"),
    PackCharacter("NYX", "Boundary/Anomaly", "Represents unknowns and edge cases", "Surfaces exceptional states for careful handling"),
)


@dataclass(frozen=True)
class GateDecision:
    decision: GateResult
    predicates: Mapping[str, bool]
    reasons: tuple[str, ...]
    evidence_conflict: bool = False


@dataclass(frozen=True)
class RuntimeEvent:
    action: str
    status: ExecutionStatus
    reason: str


@dataclass(frozen=True)
class LedgerEntry:
    entry_type: str
    recorded_at: datetime
    payload: Mapping[str, Any]


class Ledger:
    def __init__(self) -> None:
        self._entries: list[LedgerEntry] = []

    def append(self, entry_type: str, payload: Mapping[str, Any], recorded_at: datetime | None = None) -> None:
        self._entries.append(
            LedgerEntry(
                entry_type=entry_type,
                recorded_at=recorded_at or datetime.now(timezone.utc),
                payload=dict(payload),
            )
        )

    @property
    def entries(self) -> tuple[LedgerEntry, ...]:
        return tuple(self._entries)


class Gate:
    @staticmethod
    def evaluate(actor: Actor, request: GateRequest, evidence: tuple[EvidenceResult, ...], at: datetime) -> GateDecision:
        matching_leases = tuple(lease for lease in actor.authority if lease.matches(request.subject, request.scope))
        active_leases = tuple(lease for lease in matching_leases if lease.is_valid(at, request.subject, request.scope))
        capability_satisfied = request.capability in actor.capabilities
        policy_satisfied = request.policy_satisfied
        authority_valid = bool(active_leases)
        subject_valid = actor.id == request.subject and all(item.subject == request.subject for item in evidence)
        temporal_valid = bool(evidence) and all(item.is_temporally_valid(at) for item in evidence) and bool(active_leases)
        constraints_satisfied = (
            True
            if not request.required_constraints
            else any(lease.satisfies_constraints(request.required_constraints) for lease in active_leases)
        )
        evidence_conflict = any(item.epistemic_status == EpistemicStatus.CONTRADICTED for item in evidence) or (
            len({item.validity for item in evidence}) > 1
        )
        evidence_valid = bool(evidence) and all(item.validity for item in evidence) and not evidence_conflict
        predicates = {
            "C": capability_satisfied,
            "P": policy_satisfied,
            "A": authority_valid,
            "T": temporal_valid,
            "S": subject_valid,
            "R": constraints_satisfied,
            "E": evidence_valid,
        }
        reasons = tuple(key for key, ok in predicates.items() if not ok)
        if evidence_conflict:
            decision = request.conflict_mode
        else:
            decision = GateResult.ALLOW if all(predicates.values()) else GateResult.DENY
        return GateDecision(decision=decision, predicates=predicates, reasons=reasons, evidence_conflict=evidence_conflict)


class Runtime:
    @staticmethod
    def execute(decision: GateDecision, action: str, should_succeed: bool) -> RuntimeEvent:
        if decision.decision != GateResult.ALLOW:
            return RuntimeEvent(action=action, status=ExecutionStatus.NOT_ATTEMPTED, reason="Gate denied execution")
        if should_succeed:
            return RuntimeEvent(action=action, status=ExecutionStatus.SUCCEEDED, reason="Runtime completed action")
        return RuntimeEvent(action=action, status=ExecutionStatus.FAILED, reason="Runtime failed after gate approval")
