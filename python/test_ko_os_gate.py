from datetime import datetime, timedelta, timezone
import unittest

from ko_os_gate import (
    Actor,
    AuthorityLease,
    DictEvidenceAdapter,
    EpistemicStatus,
    EvidenceResult,
    ExecutionStatus,
    Gate,
    GateRequest,
    GateResult,
    Ledger,
    PACK_CHARACTERS,
    Runtime,
)


NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)


def make_lease(*, subject="wolf-1", scope="deploy", expires_in=1, constraints=None):
    return AuthorityLease(
        subject=subject,
        scope=scope,
        purpose="deploy-service",
        constraints=constraints or {"risk": "low"},
        issued_at=NOW - timedelta(hours=1),
        expires_at=NOW + timedelta(hours=expires_in),
        issuer="human-chair",
    )


def make_evidence(*, subject="wolf-1", validity=True, status=EpistemicStatus.VERIFIED, expires_in=1):
    return EvidenceResult(
        subject=subject,
        claims={"integrity": "ok"},
        source="adapter",
        observed_at=NOW - timedelta(minutes=5),
        issued_at=NOW - timedelta(minutes=5),
        expires_at=NOW + timedelta(hours=expires_in),
        validity=validity,
        provenance="adapter:tpm",
        epistemic_status=status,
    )


def make_actor(*, capabilities=("deploy",), authority=()):
    return Actor(id="wolf-1", capabilities=frozenset(capabilities), authority=authority)


class GateContractTests(unittest.TestCase):
    def test_01_missing_authority_denies(self):
        actor = make_actor()
        decision = Gate.evaluate(actor, GateRequest(subject="wolf-1", capability="deploy", scope="deploy"), (make_evidence(),), NOW)
        self.assertEqual(decision.decision, GateResult.DENY)
        self.assertFalse(decision.predicates["A"])

    def test_02_perfect_evidence_without_authority_denies(self):
        actor = make_actor()
        adapter = DictEvidenceAdapter("verifier")
        evidence = adapter.to_evidence({
            "subject": "wolf-1",
            "claims": {"pi_verified": True},
            "observed_at": NOW - timedelta(minutes=1),
            "issued_at": NOW - timedelta(minutes=1),
            "expires_at": NOW + timedelta(minutes=10),
            "validity": True,
            "provenance": "math:proof",
            "epistemic_status": EpistemicStatus.VERIFIED.value,
        })
        decision = Gate.evaluate(actor, GateRequest(subject="wolf-1", capability="deploy", scope="deploy"), (evidence,), NOW)
        self.assertEqual(decision.decision, GateResult.DENY)
        self.assertTrue(decision.predicates["E"])
        self.assertFalse(decision.predicates["A"])

    def test_03_valid_tpm_quote_without_authority_denies(self):
        actor = make_actor()
        evidence = make_evidence()
        decision = Gate.evaluate(actor, GateRequest(subject="wolf-1", capability="deploy", scope="deploy"), (evidence,), NOW)
        self.assertEqual(decision.decision, GateResult.DENY)

    def test_04_capability_without_authority_denies(self):
        actor = make_actor(capabilities=("deploy",))
        decision = Gate.evaluate(actor, GateRequest(subject="wolf-1", capability="deploy", scope="deploy"), (make_evidence(),), NOW)
        self.assertEqual(decision.decision, GateResult.DENY)

    def test_05_authority_without_evidence_denies(self):
        actor = make_actor(authority=(make_lease(),))
        decision = Gate.evaluate(actor, GateRequest(subject="wolf-1", capability="deploy", scope="deploy"), (), NOW)
        self.assertEqual(decision.decision, GateResult.DENY)
        self.assertFalse(decision.predicates["E"])

    def test_06_subject_mismatch_denies(self):
        actor = make_actor(authority=(make_lease(),))
        evidence = make_evidence(subject="other")
        decision = Gate.evaluate(actor, GateRequest(subject="wolf-1", capability="deploy", scope="deploy"), (evidence,), NOW)
        self.assertEqual(decision.decision, GateResult.DENY)
        self.assertFalse(decision.predicates["S"])

    def test_07_expired_lease_denies(self):
        actor = make_actor(authority=(make_lease(expires_in=-1),))
        decision = Gate.evaluate(actor, GateRequest(subject="wolf-1", capability="deploy", scope="deploy"), (make_evidence(),), NOW)
        self.assertEqual(decision.decision, GateResult.DENY)
        self.assertFalse(decision.predicates["A"])
        self.assertFalse(decision.predicates["T"])

    def test_08_all_predicates_allow(self):
        actor = make_actor(authority=(make_lease(),))
        decision = Gate.evaluate(
            actor,
            GateRequest(subject="wolf-1", capability="deploy", scope="deploy", required_constraints={"risk": "low"}),
            (make_evidence(),),
            NOW,
        )
        self.assertEqual(decision.decision, GateResult.ALLOW)
        self.assertTrue(all(decision.predicates.values()))

    def test_09_allow_is_not_executed(self):
        actor = make_actor(authority=(make_lease(),))
        decision = Gate.evaluate(
            actor,
            GateRequest(subject="wolf-1", capability="deploy", scope="deploy", required_constraints={"risk": "low"}),
            (make_evidence(),),
            NOW,
        )
        event = Runtime.execute(decision, "deploy-service", should_succeed=False)
        ledger = Ledger()
        ledger.append("decision", {"decision": decision.decision.value})
        ledger.append("event", {"status": event.status.value})
        self.assertEqual(decision.decision, GateResult.ALLOW)
        self.assertEqual(event.status, ExecutionStatus.FAILED)
        self.assertEqual(tuple(entry.entry_type for entry in ledger.entries), ("decision", "event"))

    def test_10_conflicting_evidence_human_review(self):
        actor = make_actor(authority=(make_lease(),))
        evidence = (
            make_evidence(validity=True, status=EpistemicStatus.VERIFIED),
            make_evidence(validity=False, status=EpistemicStatus.CONTRADICTED),
        )
        decision = Gate.evaluate(
            actor,
            GateRequest(subject="wolf-1", capability="deploy", scope="deploy", conflict_mode=GateResult.HUMAN_REVIEW),
            evidence,
            NOW,
        )
        self.assertEqual(decision.decision, GateResult.HUMAN_REVIEW)
        self.assertTrue(decision.evidence_conflict)

    def test_pack_characters_complete(self):
        self.assertEqual(len(PACK_CHARACTERS), 13)
        self.assertEqual(PACK_CHARACTERS[0].name, "QUILL")
        self.assertEqual(PACK_CHARACTERS[-1].name, "NYX")


if __name__ == "__main__":
    unittest.main()
