package koosgate

import (
	"testing"
	"time"
)

var now = time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

func lease(subject string, expiresIn time.Duration) AuthorityLease {
	return AuthorityLease{
		Subject:     subject,
		Scope:       "deploy",
		Purpose:     "deploy-service",
		Constraints: map[string]string{"risk": "low"},
		IssuedAt:    now.Add(-time.Hour),
		ExpiresAt:   now.Add(expiresIn),
		Issuer:      "human-chair",
	}
}

func evidence(subject string, validity bool, status EpistemicStatus, expiresIn time.Duration) EvidenceResult {
	return EvidenceResult{
		Subject:         subject,
		Claims:          map[string]string{"integrity": "ok"},
		Source:          "adapter",
		ObservedAt:      now.Add(-time.Minute),
		IssuedAt:        now.Add(-time.Minute),
		ExpiresAt:       now.Add(expiresIn),
		Validity:        validity,
		Provenance:      "adapter:tpm",
		EpistemicStatus: status,
	}
}

func actor(authority []AuthorityLease) Actor {
	return Actor{ID: "wolf-1", Capabilities: map[string]bool{"deploy": true}, Authority: authority}
}

func request() GateRequest {
	return GateRequest{Subject: "wolf-1", Capability: "deploy", Scope: "deploy", PolicySatisfied: true, ConflictMode: Deny}
}

func TestGateContractMatrix(t *testing.T) {
	gate := Gate{}
	tests := []struct {
		name     string
		actor    Actor
		request  GateRequest
		evidence []EvidenceResult
		assert   func(*testing.T, GateDecision)
	}{
		{"test 01", actor(nil), request(), []EvidenceResult{evidence("wolf-1", true, Verified, time.Hour)}, func(t *testing.T, decision GateDecision) {
			if decision.Decision != Deny || decision.Predicates["A"] {
				t.Fatalf("expected deny on missing authority: %+v", decision)
			}
		}},
		{"test 02", actor(nil), request(), []EvidenceResult{{Subject: "wolf-1", Claims: map[string]string{"pi_verified": "true"}, Source: "verifier", ObservedAt: now, IssuedAt: now, ExpiresAt: now.Add(time.Hour), Validity: true, Provenance: "math:proof", EpistemicStatus: Verified}}, func(t *testing.T, decision GateDecision) {
			if decision.Decision != Deny || !decision.Predicates["E"] || decision.Predicates["A"] {
				t.Fatalf("expected deny with valid evidence but no authority: %+v", decision)
			}
		}},
		{"test 03", actor(nil), request(), []EvidenceResult{evidence("wolf-1", true, Verified, time.Hour)}, func(t *testing.T, decision GateDecision) {
			if decision.Decision != Deny {
				t.Fatalf("expected deny: %+v", decision)
			}
		}},
		{"test 04", actor(nil), request(), []EvidenceResult{evidence("wolf-1", true, Verified, time.Hour)}, func(t *testing.T, decision GateDecision) {
			if decision.Decision != Deny {
				t.Fatalf("expected deny: %+v", decision)
			}
		}},
		{"test 05", actor([]AuthorityLease{lease("wolf-1", time.Hour)}), request(), nil, func(t *testing.T, decision GateDecision) {
			if decision.Decision != Deny || decision.Predicates["E"] {
				t.Fatalf("expected deny on missing evidence: %+v", decision)
			}
		}},
		{"test 06", actor([]AuthorityLease{lease("wolf-1", time.Hour)}), request(), []EvidenceResult{evidence("other", true, Verified, time.Hour)}, func(t *testing.T, decision GateDecision) {
			if decision.Decision != Deny || decision.Predicates["S"] {
				t.Fatalf("expected deny on subject mismatch: %+v", decision)
			}
		}},
		{"test 07", actor([]AuthorityLease{lease("wolf-1", -time.Hour)}), request(), []EvidenceResult{evidence("wolf-1", true, Verified, time.Hour)}, func(t *testing.T, decision GateDecision) {
			if decision.Decision != Deny || decision.Predicates["A"] || decision.Predicates["T"] {
				t.Fatalf("expected deny on expired lease: %+v", decision)
			}
		}},
		{"test 08", actor([]AuthorityLease{lease("wolf-1", time.Hour)}), GateRequest{Subject: "wolf-1", Capability: "deploy", Scope: "deploy", RequiredConstraints: map[string]string{"risk": "low"}, PolicySatisfied: true, ConflictMode: Deny}, []EvidenceResult{evidence("wolf-1", true, Verified, time.Hour)}, func(t *testing.T, decision GateDecision) {
			if decision.Decision != Allow {
				t.Fatalf("expected allow: %+v", decision)
			}
		}},
		{"test 10", actor([]AuthorityLease{lease("wolf-1", time.Hour)}), GateRequest{Subject: "wolf-1", Capability: "deploy", Scope: "deploy", PolicySatisfied: true, ConflictMode: HumanReview}, []EvidenceResult{evidence("wolf-1", true, Verified, time.Hour), evidence("wolf-1", false, Contradicted, time.Hour)}, func(t *testing.T, decision GateDecision) {
			if decision.Decision != HumanReview || !decision.EvidenceConflict {
				t.Fatalf("expected human review: %+v", decision)
			}
		}},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			decision := gate.Evaluate(tc.actor, tc.request, tc.evidence, now)
			tc.assert(t, decision)
		})
	}
}

func TestDecisionRuntimeSeparationAndLedger(t *testing.T) {
	gate := Gate{}
	runtime := Runtime{}
	decision := gate.Evaluate(actor([]AuthorityLease{lease("wolf-1", time.Hour)}), GateRequest{Subject: "wolf-1", Capability: "deploy", Scope: "deploy", RequiredConstraints: map[string]string{"risk": "low"}, PolicySatisfied: true, ConflictMode: Deny}, []EvidenceResult{evidence("wolf-1", true, Verified, time.Hour)}, now)
	if decision.Decision != Allow {
		t.Fatalf("expected allow: %+v", decision)
	}
	event := runtime.Execute(decision, "deploy-service", false)
	if event.Status != Failed {
		t.Fatalf("expected runtime failure after allow: %+v", event)
	}
	ledger := &Ledger{}
	ledger.Append("decision", map[string]string{"decision": string(decision.Decision)}, now)
	ledger.Append("event", map[string]string{"status": string(event.Status)}, now)
	if len(ledger.Entries) != 2 || ledger.Entries[0].EntryType != "decision" || ledger.Entries[1].EntryType != "event" {
		t.Fatalf("expected decision and event history: %+v", ledger.Entries)
	}
}

func TestPackCharacters(t *testing.T) {
	if len(PackCharacters) != 13 || PackCharacters[0].Name != "QUILL" || PackCharacters[12].Name != "NYX" {
		t.Fatalf("expected full pack roster: %+v", PackCharacters)
	}
}
