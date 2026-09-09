use std::collections::BTreeMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GateResult {
    Allow,
    Deny,
    HumanReview,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExecutionStatus {
    NotAttempted,
    Succeeded,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EpistemicStatus {
    Observed,
    Derived,
    Claimed,
    Inferred,
    Verified,
    Unknown,
    Contradicted,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EvidenceResult {
    pub subject: String,
    pub claims: BTreeMap<String, String>,
    pub source: String,
    pub observed_at: i64,
    pub issued_at: i64,
    pub expires_at: i64,
    pub validity: bool,
    pub provenance: String,
    pub epistemic_status: EpistemicStatus,
}

impl EvidenceResult {
    pub fn is_temporally_valid(&self, at: i64) -> bool {
        self.issued_at <= at && at <= self.expires_at
    }
}

pub trait EvidenceAdapter<T> {
    fn to_evidence(&self, raw: T) -> EvidenceResult;
}

pub struct TupleEvidenceAdapter {
    pub source_name: String,
}

impl EvidenceAdapter<(String, bool, EpistemicStatus, i64, i64, i64)> for TupleEvidenceAdapter {
    fn to_evidence(&self, raw: (String, bool, EpistemicStatus, i64, i64, i64)) -> EvidenceResult {
        let (subject, validity, epistemic_status, observed_at, issued_at, expires_at) = raw;
        EvidenceResult {
            subject,
            claims: BTreeMap::new(),
            source: self.source_name.clone(),
            observed_at,
            issued_at,
            expires_at,
            validity,
            provenance: self.source_name.clone(),
            epistemic_status,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuthorityLease {
    pub subject: String,
    pub scope: String,
    pub purpose: String,
    pub constraints: BTreeMap<String, String>,
    pub issued_at: i64,
    pub expires_at: i64,
    pub issuer: String,
}

impl AuthorityLease {
    pub fn matches(&self, subject: &str, scope: &str) -> bool {
        self.subject == subject && self.scope == scope
    }

    pub fn is_temporally_active(&self, at: i64) -> bool {
        self.issued_at <= at && at <= self.expires_at
    }

    pub fn satisfies_constraints(&self, required: &BTreeMap<String, String>) -> bool {
        required
            .iter()
            .all(|(key, value)| self.constraints.get(key) == Some(value))
    }

    pub fn is_valid(&self, at: i64, subject: &str, scope: &str) -> bool {
        self.matches(subject, scope) && self.is_temporally_active(at)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Actor {
    pub id: String,
    pub capabilities: Vec<String>,
    pub authority: Vec<AuthorityLease>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GateRequest {
    pub subject: String,
    pub capability: String,
    pub scope: String,
    pub required_constraints: BTreeMap<String, String>,
    pub policy_satisfied: bool,
    pub conflict_mode: GateResult,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PackCharacter {
    pub name: &'static str,
    pub role: &'static str,
    pub function: &'static str,
    pub contribution: &'static str,
}

pub const PACK_CHARACTERS: [PackCharacter; 13] = [
    PackCharacter {
        name: "QUILL",
        role: "Overseer/Coherence",
        function: "Coordinates constitutional consistency",
        contribution: "Checks whole-system coherence before decision",
    },
    PackCharacter {
        name: "RUNE",
        role: "Systems Architect/Structure",
        function: "Shapes interfaces, contracts, and boundaries",
        contribution: "Keeps the gate contract structurally sound",
    },
    PackCharacter {
        name: "ZYRA",
        role: "Crypto/Innovation",
        function: "Explores stronger technical evidence mechanisms",
        contribution: "Improves evidence quality without becoming authority",
    },
    PackCharacter {
        name: "VERA",
        role: "Feasibility/Reality Check",
        function: "Tests viability against reality",
        contribution: "Challenges impractical assumptions in decisions",
    },
    PackCharacter {
        name: "MAVEN",
        role: "Knowledge/Curation",
        function: "Curates context and retrieval",
        contribution: "Supplies knowledge inputs without minting authority",
    },
    PackCharacter {
        name: "ARIA",
        role: "Meaning/Expression",
        function: "Turns system state into human-facing explanation",
        contribution: "Makes outcomes understandable",
    },
    PackCharacter {
        name: "LYRA",
        role: "Human Intelligence/Context",
        function: "Maintains human-centered reasoning",
        contribution: "Protects usability and operator clarity",
    },
    PackCharacter {
        name: "SOL",
        role: "Operations/Momentum",
        function: "Coordinates approved operational flow",
        contribution: "Moves allowed work toward runtime without granting permission",
    },
    PackCharacter {
        name: "TALON",
        role: "Security/Adversarial",
        function: "Assumes hostile conditions and ambiguity",
        contribution: "Tests boundary failures and abuse cases",
    },
    PackCharacter {
        name: "KAI",
        role: "Engineering/Implementation",
        function: "Builds the actual systems",
        contribution: "Turns contracts into executable implementations",
    },
    PackCharacter {
        name: "SAGE",
        role: "Learning/Evaluation",
        function: "Evaluates patterns and feedback",
        contribution: "Improves models while respecting gate boundaries",
    },
    PackCharacter {
        name: "NARA",
        role: "Strategy/Synthesis",
        function: "Connects present decisions to long-horizon outcomes",
        contribution: "Frames system trade-offs and opportunity",
    },
    PackCharacter {
        name: "NYX",
        role: "Boundary/Anomaly",
        function: "Represents unknowns and edge cases",
        contribution: "Surfaces exceptional states for careful handling",
    },
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GateDecision {
    pub decision: GateResult,
    pub predicates: BTreeMap<String, bool>,
    pub reasons: Vec<String>,
    pub evidence_conflict: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeEvent {
    pub action: String,
    pub status: ExecutionStatus,
    pub reason: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LedgerEntry {
    pub entry_type: String,
    pub recorded_at: i64,
    pub payload: BTreeMap<String, String>,
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct Ledger {
    pub entries: Vec<LedgerEntry>,
}

impl Ledger {
    pub fn append(
        &mut self,
        entry_type: &str,
        payload: BTreeMap<String, String>,
        recorded_at: i64,
    ) {
        self.entries.push(LedgerEntry {
            entry_type: entry_type.to_string(),
            recorded_at,
            payload,
        });
    }
}

pub struct Gate;

impl Gate {
    pub fn evaluate(
        actor: &Actor,
        request: &GateRequest,
        evidence: &[EvidenceResult],
        at: i64,
    ) -> GateDecision {
        let matching: Vec<&AuthorityLease> = actor
            .authority
            .iter()
            .filter(|lease| lease.matches(&request.subject, &request.scope))
            .collect();
        let active: Vec<&AuthorityLease> = matching
            .iter()
            .copied()
            .filter(|lease| lease.is_valid(at, &request.subject, &request.scope))
            .collect();
        let capability_satisfied = actor
            .capabilities
            .iter()
            .any(|capability| capability == &request.capability);
        let policy_satisfied = request.policy_satisfied;
        let authority_valid = !active.is_empty();
        let mut subject_valid = actor.id == request.subject;
        let mut temporal_valid = !evidence.is_empty() && !active.is_empty();
        let mut evidence_valid = !evidence.is_empty();
        let mut evidence_conflict = false;
        let mut validity_marker: Option<bool> = None;
        for item in evidence {
            if item.subject != request.subject {
                subject_valid = false;
            }
            if !item.is_temporally_valid(at) {
                temporal_valid = false;
            }
            if item.epistemic_status == EpistemicStatus::Contradicted {
                evidence_conflict = true;
            }
            if !item.validity {
                evidence_valid = false;
            }
            if let Some(previous) = validity_marker {
                if previous != item.validity {
                    evidence_conflict = true;
                }
            } else {
                validity_marker = Some(item.validity);
            }
        }
        let constraints_satisfied = if request.required_constraints.is_empty() {
            true
        } else {
            active
                .iter()
                .any(|lease| lease.satisfies_constraints(&request.required_constraints))
        };
        evidence_valid = evidence_valid && !evidence_conflict && !evidence.is_empty();
        let predicates = BTreeMap::from([
            ("C".to_string(), capability_satisfied),
            ("P".to_string(), policy_satisfied),
            ("A".to_string(), authority_valid),
            ("T".to_string(), temporal_valid),
            ("S".to_string(), subject_valid),
            ("R".to_string(), constraints_satisfied),
            ("E".to_string(), evidence_valid),
        ]);
        let reasons = predicates
            .iter()
            .filter_map(|(key, value)| if *value { None } else { Some(key.clone()) })
            .collect();
        let decision = if evidence_conflict {
            request.conflict_mode
        } else if predicates.values().all(|value| *value) {
            GateResult::Allow
        } else {
            GateResult::Deny
        };
        GateDecision {
            decision,
            predicates,
            reasons,
            evidence_conflict,
        }
    }
}

pub struct Runtime;

impl Runtime {
    pub fn execute(decision: &GateDecision, action: &str, should_succeed: bool) -> RuntimeEvent {
        if decision.decision != GateResult::Allow {
            return RuntimeEvent {
                action: action.to_string(),
                status: ExecutionStatus::NotAttempted,
                reason: "Gate denied execution".to_string(),
            };
        }
        if should_succeed {
            RuntimeEvent {
                action: action.to_string(),
                status: ExecutionStatus::Succeeded,
                reason: "Runtime completed action".to_string(),
            }
        } else {
            RuntimeEvent {
                action: action.to_string(),
                status: ExecutionStatus::Failed,
                reason: "Runtime failed after gate approval".to_string(),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const NOW: i64 = 1_767_225_600;

    fn lease(subject: &str, expires_in: i64) -> AuthorityLease {
        AuthorityLease {
            subject: subject.to_string(),
            scope: "deploy".to_string(),
            purpose: "deploy-service".to_string(),
            constraints: BTreeMap::from([("risk".to_string(), "low".to_string())]),
            issued_at: NOW - 3600,
            expires_at: NOW + expires_in,
            issuer: "human-chair".to_string(),
        }
    }

    fn evidence(
        subject: &str,
        validity: bool,
        epistemic_status: EpistemicStatus,
        expires_in: i64,
    ) -> EvidenceResult {
        EvidenceResult {
            subject: subject.to_string(),
            claims: BTreeMap::from([("integrity".to_string(), "ok".to_string())]),
            source: "adapter".to_string(),
            observed_at: NOW - 60,
            issued_at: NOW - 60,
            expires_at: NOW + expires_in,
            validity,
            provenance: "adapter:tpm".to_string(),
            epistemic_status,
        }
    }

    fn actor(authority: Vec<AuthorityLease>) -> Actor {
        Actor {
            id: "wolf-1".to_string(),
            capabilities: vec!["deploy".to_string()],
            authority,
        }
    }

    fn request() -> GateRequest {
        GateRequest {
            subject: "wolf-1".to_string(),
            capability: "deploy".to_string(),
            scope: "deploy".to_string(),
            required_constraints: BTreeMap::new(),
            policy_satisfied: true,
            conflict_mode: GateResult::Deny,
        }
    }

    #[test]
    fn test_matrix() {
        let decision = Gate::evaluate(
            &actor(vec![]),
            &request(),
            &[evidence("wolf-1", true, EpistemicStatus::Verified, 3600)],
            NOW,
        );
        assert_eq!(decision.decision, GateResult::Deny);
        assert!(!decision.predicates["A"]);

        let adapter = TupleEvidenceAdapter {
            source_name: "verifier".to_string(),
        };
        let perfect = adapter.to_evidence((
            "wolf-1".to_string(),
            true,
            EpistemicStatus::Verified,
            NOW - 10,
            NOW - 10,
            NOW + 3600,
        ));
        let decision = Gate::evaluate(&actor(vec![]), &request(), &[perfect], NOW);
        assert_eq!(decision.decision, GateResult::Deny);
        assert!(decision.predicates["E"]);
        assert!(!decision.predicates["A"]);

        let decision = Gate::evaluate(
            &actor(vec![]),
            &request(),
            &[evidence("wolf-1", true, EpistemicStatus::Verified, 3600)],
            NOW,
        );
        assert_eq!(decision.decision, GateResult::Deny);

        let decision = Gate::evaluate(
            &actor(vec![]),
            &request(),
            &[evidence("wolf-1", true, EpistemicStatus::Verified, 3600)],
            NOW,
        );
        assert_eq!(decision.decision, GateResult::Deny);

        let decision = Gate::evaluate(&actor(vec![lease("wolf-1", 3600)]), &request(), &[], NOW);
        assert_eq!(decision.decision, GateResult::Deny);
        assert!(!decision.predicates["E"]);

        let decision = Gate::evaluate(
            &actor(vec![lease("wolf-1", 3600)]),
            &request(),
            &[evidence("other", true, EpistemicStatus::Verified, 3600)],
            NOW,
        );
        assert_eq!(decision.decision, GateResult::Deny);
        assert!(!decision.predicates["S"]);

        let decision = Gate::evaluate(
            &actor(vec![lease("wolf-1", -3600)]),
            &request(),
            &[evidence("wolf-1", true, EpistemicStatus::Verified, 3600)],
            NOW,
        );
        assert_eq!(decision.decision, GateResult::Deny);
        assert!(!decision.predicates["A"]);
        assert!(!decision.predicates["T"]);

        let allow_request = GateRequest {
            required_constraints: BTreeMap::from([("risk".to_string(), "low".to_string())]),
            ..request()
        };
        let decision = Gate::evaluate(
            &actor(vec![lease("wolf-1", 3600)]),
            &allow_request,
            &[evidence("wolf-1", true, EpistemicStatus::Verified, 3600)],
            NOW,
        );
        assert_eq!(decision.decision, GateResult::Allow);
        assert!(decision.predicates.values().all(|value| *value));

        let event = Runtime::execute(&decision, "deploy-service", false);
        assert_eq!(event.status, ExecutionStatus::Failed);
        let mut ledger = Ledger::default();
        ledger.append(
            "decision",
            BTreeMap::from([("decision".to_string(), "ALLOW".to_string())]),
            NOW,
        );
        ledger.append(
            "event",
            BTreeMap::from([("status".to_string(), "FAILED".to_string())]),
            NOW,
        );
        assert_eq!(ledger.entries.len(), 2);
        assert_eq!(ledger.entries[0].entry_type, "decision");
        assert_eq!(ledger.entries[1].entry_type, "event");

        let review_request = GateRequest {
            conflict_mode: GateResult::HumanReview,
            ..request()
        };
        let decision = Gate::evaluate(
            &actor(vec![lease("wolf-1", 3600)]),
            &review_request,
            &[
                evidence("wolf-1", true, EpistemicStatus::Verified, 3600),
                evidence("wolf-1", false, EpistemicStatus::Contradicted, 3600),
            ],
            NOW,
        );
        assert_eq!(decision.decision, GateResult::HumanReview);
        assert!(decision.evidence_conflict);
    }

    #[test]
    fn pack_characters_complete() {
        assert_eq!(PACK_CHARACTERS.len(), 13);
        assert_eq!(PACK_CHARACTERS[0].name, "QUILL");
        assert_eq!(PACK_CHARACTERS[12].name, "NYX");
    }
}
