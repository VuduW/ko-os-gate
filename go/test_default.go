package koosgate

import (
	"testing"
	"time"
)

func TestDefaultPolicySatisfied(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	gate := Gate{}
	
	// Request with PolicySatisfied not set (should default to false in Go!)
	req := GateRequest{
		Subject: "wolf-1",
		Capability: "deploy",
		Scope: "deploy",
		// PolicySatisfied is NOT set - defaults to false!
		ConflictMode: Deny,
	}
	
	actor := Actor{
		ID: "wolf-1",
		Capabilities: map[string]bool{"deploy": true},
		Authority: []AuthorityLease{
			{
				Subject: "wolf-1",
				Scope: "deploy",
				Purpose: "test",
				Constraints: map[string]string{},
				IssuedAt: now.Add(-time.Hour),
				ExpiresAt: now.Add(time.Hour),
				Issuer: "test",
			},
		},
	}
	
	evidence := []EvidenceResult{
		{
			Subject: "wolf-1",
			Claims: map[string]string{"test": "ok"},
			Source: "test",
			ObservedAt: now,
			IssuedAt: now,
			ExpiresAt: now.Add(time.Hour),
			Validity: true,
			Provenance: "test",
			EpistemicStatus: Verified,
		},
	}
	
	decision := gate.Evaluate(actor, req, evidence, now)
	t.Logf("PolicySatisfied not set: %v", decision.Predicates["P"])
	t.Logf("Decision: %v", decision.Decision)
	
	if decision.Decision == Allow {
		t.Fatalf("Expected DENY when PolicySatisfied not set, got %v", decision.Decision)
	}
}
