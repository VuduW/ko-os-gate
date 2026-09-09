import test from 'node:test';
import assert from 'node:assert/strict';

import { gate, runtime, Ledger, ObjectEvidenceAdapter, PACK_CHARACTERS, type Actor, type AuthorityLease, type EvidenceResult } from './gate.ts';

const now = new Date('2026-01-01T00:00:00Z');

function lease(subject = 'wolf-1', expiresHours = 1): AuthorityLease {
  return {
    subject,
    scope: 'deploy',
    purpose: 'deploy-service',
    constraints: { risk: 'low' },
    issued_at: new Date('2025-12-31T23:00:00Z'),
    expires_at: new Date(now.getTime() + expiresHours * 60 * 60 * 1000),
    issuer: 'human-chair',
  };
}

function evidence(subject = 'wolf-1', validity = true, status: EvidenceResult['epistemic_status'] = 'VERIFIED', expiresHours = 1): EvidenceResult {
  return {
    subject,
    claims: { integrity: 'ok' },
    source: 'adapter',
    observed_at: new Date('2025-12-31T23:55:00Z'),
    issued_at: new Date('2025-12-31T23:55:00Z'),
    expires_at: new Date(now.getTime() + expiresHours * 60 * 60 * 1000),
    validity,
    provenance: 'adapter:tpm',
    epistemic_status: status,
  };
}

function actor(authority: AuthorityLease[] = []): Actor {
  return { id: 'wolf-1', capabilities: ['deploy'], authority };
}

test('01 missing authority denies', () => {
  const decision = gate(actor(), { subject: 'wolf-1', capability: 'deploy', scope: 'deploy' }, [evidence()], now);
  assert.equal(decision.decision, 'DENY');
  assert.equal(decision.predicates.A, false);
});

test('02 perfect evidence without authority denies', () => {
  const adapter = new ObjectEvidenceAdapter('verifier');
  const perfect = adapter.toEvidence({
    subject: 'wolf-1',
    claims: { pi_verified: true },
    observed_at: new Date('2025-12-31T23:59:00Z'),
    issued_at: new Date('2025-12-31T23:59:00Z'),
    expires_at: new Date('2026-01-01T01:00:00Z'),
    validity: true,
    provenance: 'math:proof',
    epistemic_status: 'VERIFIED',
  });
  const decision = gate(actor(), { subject: 'wolf-1', capability: 'deploy', scope: 'deploy' }, [perfect], now);
  assert.equal(decision.decision, 'DENY');
  assert.equal(decision.predicates.E, true);
  assert.equal(decision.predicates.A, false);
});

test('03 valid TPM quote without authority denies', () => {
  assert.equal(gate(actor(), { subject: 'wolf-1', capability: 'deploy', scope: 'deploy' }, [evidence()], now).decision, 'DENY');
});

test('04 capability without authority denies', () => {
  assert.equal(gate(actor(), { subject: 'wolf-1', capability: 'deploy', scope: 'deploy' }, [evidence()], now).decision, 'DENY');
});

test('05 authority without evidence denies', () => {
  const decision = gate(actor([lease()]), { subject: 'wolf-1', capability: 'deploy', scope: 'deploy' }, [], now);
  assert.equal(decision.decision, 'DENY');
  assert.equal(decision.predicates.E, false);
});

test('06 subject mismatch denies', () => {
  const decision = gate(actor([lease()]), { subject: 'wolf-1', capability: 'deploy', scope: 'deploy' }, [evidence('other')], now);
  assert.equal(decision.decision, 'DENY');
  assert.equal(decision.predicates.S, false);
});

test('07 expired lease denies', () => {
  const decision = gate(actor([lease('wolf-1', -1)]), { subject: 'wolf-1', capability: 'deploy', scope: 'deploy' }, [evidence()], now);
  assert.equal(decision.decision, 'DENY');
  assert.equal(decision.predicates.A, false);
  assert.equal(decision.predicates.T, false);
});

test('08 all predicates satisfied allows', () => {
  const decision = gate(actor([lease()]), { subject: 'wolf-1', capability: 'deploy', scope: 'deploy', required_constraints: { risk: 'low' } }, [evidence()], now);
  assert.equal(decision.decision, 'ALLOW');
  assert.ok(Object.values(decision.predicates).every(Boolean));
});

test('09 gate allow does not imply runtime success', () => {
  const decision = gate(actor([lease()]), { subject: 'wolf-1', capability: 'deploy', scope: 'deploy', required_constraints: { risk: 'low' } }, [evidence()], now);
  const event = runtime(decision, 'deploy-service', false);
  const ledger = new Ledger();
  ledger.append({ entry_type: 'decision', recorded_at: now, payload: { decision: decision.decision } });
  ledger.append({ entry_type: 'event', recorded_at: now, payload: { status: event.status } });
  assert.equal(decision.decision, 'ALLOW');
  assert.equal(event.status, 'FAILED');
  assert.deepEqual(ledger.entries().map((entry) => entry.entry_type), ['decision', 'event']);
});

test('10 conflicting evidence can escalate to human review', () => {
  const decision = gate(
    actor([lease()]),
    { subject: 'wolf-1', capability: 'deploy', scope: 'deploy', conflict_mode: 'HUMAN_REVIEW' },
    [evidence('wolf-1', true, 'VERIFIED'), evidence('wolf-1', false, 'CONTRADICTED')],
    now,
  );
  assert.equal(decision.decision, 'HUMAN_REVIEW');
  assert.equal(decision.evidence_conflict, true);
});

test('pack roster is complete', () => {
  assert.equal(PACK_CHARACTERS.length, 13);
  assert.equal(PACK_CHARACTERS[0].name, 'QUILL');
  assert.equal(PACK_CHARACTERS.at(-1)?.name, 'NYX');
});
