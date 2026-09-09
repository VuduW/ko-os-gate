# KO-OS Gate Contract

A minimal, self-contained implementation of the KO-OS gate contract across Python, Go, Rust, and TypeScript, plus a small interactive constellation UI.

## Core Equation

```text
G = C AND P AND A AND T AND S AND R AND E
```

- `C` capability satisfied
- `P` policy satisfied
- `A` authority valid
- `T` temporal validity
- `S` subject valid
- `R` required constraints satisfied
- `E` evidence valid

The gate returns a decision only. Runtime is separate and cannot rewrite the gate decision.

## Architecture

```text
Human Sovereign
      |
      v
  Authority Lease
      |
      v
Technology -> Adapter -> EvidenceResult -> Gate -> Decision Ledger
                                       |
                                       v
                                    Runtime -> Event Ledger
```

### Constitutional boundaries

- evidence does not become authority
- capability does not become authority
- gate does not execute
- runtime does not modify gate decisions
- ledger records decision and event as separate append-only entries

## Repository layout

```text
python/      Reference implementation and unittest matrix
go/          Go implementation and table-driven tests
rust/        Rust library implementation and tests
typescript/  TypeScript implementation and node:test matrix
web/         Minimal interactive game-like interface
```

## Domain model

Each implementation contains:

- `EvidenceResult` with subject, claims, source, observed/issued/expires timestamps, validity, provenance, and epistemic status
- technology-neutral evidence adapter
- `AuthorityLease` with validity checks for subject, scope, and time
- `Actor`, `GateRequest`, `GateDecision`, `RuntimeEvent`, and append-only `Ledger`
- all 13 Pack character roles as coordinator metadata

## Pack characters

QUILL, RUNE, ZYRA, VERA, MAVEN, ARIA, LYRA, SOL, TALON, KAI, SAGE, NARA, and NYX are included in every implementation with role, function, and contribution fields.

## Test matrix

All implementations cover the required scenarios:

1. C=1, P=1, A=0 -> DENY
2. Verify(pi)=1, Authority=0 -> DENY
3. TPM quote valid, Authority=0 -> DENY
4. Capability=1, Authority=0 -> DENY
5. Authority=1, Evidence=0 -> DENY
6. Subject mismatch -> DENY
7. Lease expired -> DENY
8. All predicates satisfied -> ALLOW
9. Gate=ALLOW, Runtime=FAILURE -> decision stays ALLOW, execution is FAILED
10. Conflicting evidence -> policy can escalate to HUMAN_REVIEW

## Run the tests

From `/home/runner/work/ko-os-gate/ko-os-gate`:

```bash
python3 -m unittest discover -s python -p 'test_*.py'
cd /home/runner/work/ko-os-gate/ko-os-gate/go && go test ./...
cd /home/runner/work/ko-os-gate/ko-os-gate/rust && cargo test
node --test /home/runner/work/ko-os-gate/ko-os-gate/typescript/gate.test.ts
```

Node 24 in the runner executes the TypeScript tests directly, so no npm dependency is required.

## Use the interactive interface

Open `/home/runner/work/ko-os-gate/ko-os-gate/web/index.html` in a browser.

The interface provides:

- a constellation/network view for `C P A T S R E` and `G`
- clickable nodes with drill-down explanations
- playable scenario buttons for tests 01-10
- clickable Pack character cards with role details
- a visible distinction between gate decision and runtime result

## Language notes

### Python

- reference implementation in `python/ko_os_gate.py`
- tests in `python/test_ko_os_gate.py`

### Go

- implementation in `go/gate.go`
- tests in `go/gate_test.go`

### Rust

- library in `rust/src/lib.rs`
- tests inline under `#[cfg(test)]`

### TypeScript

- implementation in `typescript/gate.ts`
- tests in `typescript/gate.test.ts`

## Acceptance summary

This repository preserves the required invariants:

- `E=1` and `A=0` still yields `DENY`
- `ALLOW != EXECUTED`
- gate cannot execute or mint authority
- runtime cannot convert capability into authority
- vendor-specific technologies terminate at the adapter boundary
- history records decisions and runtime events separately
