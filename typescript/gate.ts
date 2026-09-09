export type GateResult = 'ALLOW' | 'DENY' | 'HUMAN_REVIEW';
export type ExecutionStatus = 'NOT_ATTEMPTED' | 'SUCCEEDED' | 'FAILED';
export type EpistemicStatus = 'OBSERVED' | 'DERIVED' | 'CLAIMED' | 'INFERRED' | 'VERIFIED' | 'UNKNOWN' | 'CONTRADICTED';

export interface EvidenceResult {
  subject: string;
  claims: Record<string, unknown>;
  source: string;
  observed_at: Date;
  issued_at: Date;
  expires_at: Date;
  validity: boolean;
  provenance: string;
  epistemic_status: EpistemicStatus;
}

export interface EvidenceAdapter<T> {
  toEvidence(raw: T): EvidenceResult;
}

export class ObjectEvidenceAdapter implements EvidenceAdapter<Record<string, unknown>> {
  private readonly sourceName: string;

  constructor(sourceName: string) {
    this.sourceName = sourceName;
  }

  toEvidence(raw: Record<string, unknown>): EvidenceResult {
    return {
      subject: String(raw.subject),
      claims: (raw.claims as Record<string, unknown>) ?? {},
      source: this.sourceName,
      observed_at: raw.observed_at as Date,
      issued_at: raw.issued_at as Date,
      expires_at: raw.expires_at as Date,
      validity: Boolean(raw.validity),
      provenance: String(raw.provenance ?? this.sourceName),
      epistemic_status: (raw.epistemic_status as EpistemicStatus) ?? 'UNKNOWN',
    };
  }
}

export interface AuthorityLease {
  subject: string;
  scope: string;
  purpose: string;
  constraints: Record<string, string>;
  issued_at: Date;
  expires_at: Date;
  issuer: string;
}

export interface Actor {
  id: string;
  capabilities: string[];
  authority: AuthorityLease[];
}

export interface GateRequest {
  subject: string;
  capability: string;
  scope: string;
  required_constraints?: Record<string, string>;
  policy_satisfied?: boolean;
  conflict_mode?: GateResult;
}

export interface PackCharacter {
  name: string;
  role: string;
  function: string;
  contribution: string;
}

export const PACK_CHARACTERS: PackCharacter[] = [
  { name: 'QUILL', role: 'Overseer/Coherence', function: 'Coordinates constitutional consistency', contribution: 'Checks whole-system coherence before decision' },
  { name: 'RUNE', role: 'Systems Architect/Structure', function: 'Shapes interfaces, contracts, and boundaries', contribution: 'Keeps the gate contract structurally sound' },
  { name: 'ZYRA', role: 'Crypto/Innovation', function: 'Explores stronger technical evidence mechanisms', contribution: 'Improves evidence quality without becoming authority' },
  { name: 'VERA', role: 'Feasibility/Reality Check', function: 'Tests viability against reality', contribution: 'Challenges impractical assumptions in decisions' },
  { name: 'MAVEN', role: 'Knowledge/Curation', function: 'Curates context and retrieval', contribution: 'Supplies knowledge inputs without minting authority' },
  { name: 'ARIA', role: 'Meaning/Expression', function: 'Turns system state into human-facing explanation', contribution: 'Makes outcomes understandable' },
  { name: 'LYRA', role: 'Human Intelligence/Context', function: 'Maintains human-centered reasoning', contribution: 'Protects usability and operator clarity' },
  { name: 'SOL', role: 'Operations/Momentum', function: 'Coordinates approved operational flow', contribution: 'Moves allowed work toward runtime without granting permission' },
  { name: 'TALON', role: 'Security/Adversarial', function: 'Assumes hostile conditions and ambiguity', contribution: 'Tests boundary failures and abuse cases' },
  { name: 'KAI', role: 'Engineering/Implementation', function: 'Builds the actual systems', contribution: 'Turns contracts into executable implementations' },
  { name: 'SAGE', role: 'Learning/Evaluation', function: 'Evaluates patterns and feedback', contribution: 'Improves models while respecting gate boundaries' },
  { name: 'NARA', role: 'Strategy/Synthesis', function: 'Connects present decisions to long-horizon outcomes', contribution: 'Frames system trade-offs and opportunity' },
  { name: 'NYX', role: 'Boundary/Anomaly', function: 'Represents unknowns and edge cases', contribution: 'Surfaces exceptional states for careful handling' },
];

export interface GateDecision {
  decision: GateResult;
  predicates: Record<string, boolean>;
  reasons: string[];
  evidence_conflict: boolean;
}

export interface RuntimeEvent {
  action: string;
  status: ExecutionStatus;
  reason: string;
}

export interface LedgerEntry {
  entry_type: 'decision' | 'event';
  recorded_at: Date;
  payload: Record<string, string>;
}

export class Ledger {
  private readonly history: LedgerEntry[] = [];

  append(entry: LedgerEntry): void {
    this.history.push({ ...entry, payload: { ...entry.payload } });
  }

  entries(): LedgerEntry[] {
    return [...this.history];
  }
}

export function leaseIsValid(lease: AuthorityLease, at: Date, subject: string, scope: string): boolean {
  return lease.subject === subject && lease.scope === scope && lease.issued_at <= at && at <= lease.expires_at;
}

export function gate(actor: Actor, request: GateRequest, evidence: EvidenceResult[], at: Date): GateDecision {
  const requiredConstraints = request.required_constraints ?? {};
  const activeLeases = actor.authority.filter((lease) => leaseIsValid(lease, at, request.subject, request.scope));
  const capability = actor.capabilities.includes(request.capability);
  const policy = request.policy_satisfied ?? true;
  const authority = activeLeases.length > 0;
  const subject = actor.id === request.subject && evidence.every((item) => item.subject === request.subject);
  const temporal = evidence.length > 0 && activeLeases.length > 0 && evidence.every((item) => item.issued_at <= at && at <= item.expires_at);
  const constraints = Object.keys(requiredConstraints).length === 0
    ? true
    : activeLeases.some((lease) => Object.entries(requiredConstraints).every(([key, value]) => lease.constraints[key] === value));
  const evidenceConflict = evidence.some((item) => item.epistemic_status === 'CONTRADICTED')
    || new Set(evidence.map((item) => item.validity)).size > 1;
  const evidenceValid = evidence.length > 0 && evidence.every((item) => item.validity) && !evidenceConflict;
  const predicates = { C: capability, P: policy, A: authority, T: temporal, S: subject, R: constraints, E: evidenceValid };
  return {
    decision: evidenceConflict ? (request.conflict_mode ?? 'DENY') : (Object.values(predicates).every(Boolean) ? 'ALLOW' : 'DENY'),
    predicates,
    reasons: Object.entries(predicates).filter(([, ok]) => !ok).map(([key]) => key),
    evidence_conflict: evidenceConflict,
  };
}

export function runtime(decision: GateDecision, action: string, shouldSucceed: boolean): RuntimeEvent {
  if (decision.decision !== 'ALLOW') {
    return { action, status: 'NOT_ATTEMPTED', reason: 'Gate denied execution' };
  }
  return shouldSucceed
    ? { action, status: 'SUCCEEDED', reason: 'Runtime completed action' }
    : { action, status: 'FAILED', reason: 'Runtime failed after gate approval' };
}
