package koosgate

import "time"

type GateResult string

type ExecutionStatus string

type EpistemicStatus string

const (
	Allow       GateResult = "ALLOW"
	Deny        GateResult = "DENY"
	HumanReview GateResult = "HUMAN_REVIEW"

	NotAttempted ExecutionStatus = "NOT_ATTEMPTED"
	Succeeded    ExecutionStatus = "SUCCEEDED"
	Failed       ExecutionStatus = "FAILED"

	Observed     EpistemicStatus = "OBSERVED"
	Derived      EpistemicStatus = "DERIVED"
	Claimed      EpistemicStatus = "CLAIMED"
	Inferred     EpistemicStatus = "INFERRED"
	Verified     EpistemicStatus = "VERIFIED"
	Unknown      EpistemicStatus = "UNKNOWN"
	Contradicted EpistemicStatus = "CONTRADICTED"
)

type EvidenceResult struct {
	Subject         string
	Claims          map[string]string
	Source          string
	ObservedAt      time.Time
	IssuedAt        time.Time
	ExpiresAt       time.Time
	Validity        bool
	Provenance      string
	EpistemicStatus EpistemicStatus
}

func (e EvidenceResult) IsTemporallyValid(at time.Time) bool {
	return !at.Before(e.IssuedAt) && !at.After(e.ExpiresAt)
}

type AuthorityLease struct {
	Subject     string
	Scope       string
	Purpose     string
	Constraints map[string]string
	IssuedAt    time.Time
	ExpiresAt   time.Time
	Issuer      string
}

func (a AuthorityLease) Matches(subject, scope string) bool {
	return a.Subject == subject && a.Scope == scope
}

func (a AuthorityLease) IsTemporallyActive(at time.Time) bool {
	return !at.Before(a.IssuedAt) && !at.After(a.ExpiresAt)
}

func (a AuthorityLease) SatisfiesConstraints(required map[string]string) bool {
	for key, value := range required {
		if a.Constraints[key] != value {
			return false
		}
	}
	return true
}

func (a AuthorityLease) IsValid(at time.Time, subject, scope string) bool {
	return a.Matches(subject, scope) && a.IsTemporallyActive(at)
}

type Actor struct {
	ID           string
	Capabilities map[string]bool
	Authority    []AuthorityLease
}

type GateRequest struct {
	Subject             string
	Capability          string
	Scope               string
	RequiredConstraints map[string]string
	PolicySatisfied     bool
	PolicySpecified     bool
	ConflictMode        GateResult
}

type PackCharacter struct {
	Name         string
	Role         string
	Function     string
	Contribution string
}

var PackCharacters = []PackCharacter{
	{"QUILL", "Overseer/Coherence", "Coordinates constitutional consistency", "Checks whole-system coherence before decision"},
	{"RUNE", "Systems Architect/Structure", "Shapes interfaces, contracts, and boundaries", "Keeps the gate contract structurally sound"},
	{"ZYRA", "Crypto/Innovation", "Explores stronger technical evidence mechanisms", "Improves evidence quality without becoming authority"},
	{"VERA", "Feasibility/Reality Check", "Tests viability against reality", "Challenges impractical assumptions in decisions"},
	{"MAVEN", "Knowledge/Curation", "Curates context and retrieval", "Supplies knowledge inputs without minting authority"},
	{"ARIA", "Meaning/Expression", "Turns system state into human-facing explanation", "Makes outcomes understandable"},
	{"LYRA", "Human Intelligence/Context", "Maintains human-centered reasoning", "Protects usability and operator clarity"},
	{"SOL", "Operations/Momentum", "Coordinates approved operational flow", "Moves allowed work toward runtime without granting permission"},
	{"TALON", "Security/Adversarial", "Assumes hostile conditions and ambiguity", "Tests boundary failures and abuse cases"},
	{"KAI", "Engineering/Implementation", "Builds the actual systems", "Turns contracts into executable implementations"},
	{"SAGE", "Learning/Evaluation", "Evaluates patterns and feedback", "Improves models while respecting gate boundaries"},
	{"NARA", "Strategy/Synthesis", "Connects present decisions to long-horizon outcomes", "Frames system trade-offs and opportunity"},
	{"NYX", "Boundary/Anomaly", "Represents unknowns and edge cases", "Surfaces exceptional states for careful handling"},
}

type GateDecision struct {
	Decision         GateResult
	Predicates       map[string]bool
	Reasons          []string
	EvidenceConflict bool
}

type RuntimeEvent struct {
	Action string
	Status ExecutionStatus
	Reason string
}

type LedgerEntry struct {
	EntryType  string
	RecordedAt time.Time
	Payload    map[string]string
}

type Ledger struct {
	Entries []LedgerEntry
}

func (l *Ledger) Append(entryType string, payload map[string]string, recordedAt time.Time) {
	copyPayload := map[string]string{}
	for key, value := range payload {
		copyPayload[key] = value
	}
	l.Entries = append(l.Entries, LedgerEntry{EntryType: entryType, RecordedAt: recordedAt, Payload: copyPayload})
}

type Gate struct{}

func (r GateRequest) policySatisfied() bool {
	if !r.PolicySpecified {
		return true
	}
	return r.PolicySatisfied
}

func (r GateRequest) conflictMode() GateResult {
	if r.ConflictMode == "" {
		return Deny
	}
	return r.ConflictMode
}

func (Gate) Evaluate(actor Actor, request GateRequest, evidence []EvidenceResult, at time.Time) GateDecision {
	matching := []AuthorityLease{}
	active := []AuthorityLease{}
	for _, lease := range actor.Authority {
		if lease.Matches(request.Subject, request.Scope) {
			matching = append(matching, lease)
			if lease.IsValid(at, request.Subject, request.Scope) {
				active = append(active, lease)
			}
		}
	}
	capabilitySatisfied := actor.Capabilities[request.Capability]
	policySatisfied := request.policySatisfied()
	authorityValid := len(active) > 0
	subjectValid := actor.ID == request.Subject
	temporalValid := len(evidence) > 0 && len(active) > 0
	evidenceConflict := false
	evidenceValid := len(evidence) > 0
	firstValidity := false
	haveValidity := false
	for _, item := range evidence {
		if item.Subject != request.Subject {
			subjectValid = false
		}
		if !item.IsTemporallyValid(at) {
			temporalValid = false
		}
		if item.EpistemicStatus == Contradicted {
			evidenceConflict = true
		}
		if !item.Validity {
			evidenceValid = false
		}
		if !haveValidity {
			firstValidity = item.Validity
			haveValidity = true
		} else if firstValidity != item.Validity {
			evidenceConflict = true
		}
	}
	constraintsSatisfied := true
	if len(request.RequiredConstraints) > 0 {
		constraintsSatisfied = false
		for _, lease := range active {
			if lease.SatisfiesConstraints(request.RequiredConstraints) {
				constraintsSatisfied = true
				break
			}
		}
	}
	evidenceValid = evidenceValid && !evidenceConflict && len(evidence) > 0
	predicates := map[string]bool{
		"C": capabilitySatisfied,
		"P": policySatisfied,
		"A": authorityValid,
		"T": temporalValid,
		"S": subjectValid,
		"R": constraintsSatisfied,
		"E": evidenceValid,
	}
	reasons := []string{}
	for _, key := range []string{"C", "P", "A", "T", "S", "R", "E"} {
		if !predicates[key] {
			reasons = append(reasons, key)
		}
	}
	decision := Deny
	if evidenceConflict {
		decision = request.conflictMode()
	} else if capabilitySatisfied && policySatisfied && authorityValid && temporalValid && subjectValid && constraintsSatisfied && evidenceValid {
		decision = Allow
	}
	return GateDecision{Decision: decision, Predicates: predicates, Reasons: reasons, EvidenceConflict: evidenceConflict}
}

type Runtime struct{}

func (Runtime) Execute(decision GateDecision, action string, shouldSucceed bool) RuntimeEvent {
	if decision.Decision != Allow {
		return RuntimeEvent{Action: action, Status: NotAttempted, Reason: "Gate denied execution"}
	}
	if shouldSucceed {
		return RuntimeEvent{Action: action, Status: Succeeded, Reason: "Runtime completed action"}
	}
	return RuntimeEvent{Action: action, Status: Failed, Reason: "Runtime failed after gate approval"}
}
