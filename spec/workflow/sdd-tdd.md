# SDD + TDD Workflow Spec

## Purpose

All implementation work must be driven by repository specs and verified by tests before code is treated as complete.

## Required sequence

1. **Spec first**
   - If the request changes behavior, constraints, UX, operations, or acceptance criteria, update or create the relevant `spec/` document first.
   - Link new specs from `spec/index.md`.

2. **Tests from specs**
   - Read the relevant specs and inspect existing tests.
   - Add missing tests or update tests when the spec changed.
   - Tests should describe observable behavior, not implementation details.

3. **All Red gate**
   - Before implementation, run the new or required tests.
   - Confirm they fail for the expected reason: missing or outdated behavior.
   - If they pass immediately, the test is not proving the requested change; revise before coding.

4. **Implementation**
   - Implement the smallest change that satisfies the spec and tests.
   - Avoid unrelated refactors or scope expansion.

5. **All Green gate**
   - Run the relevant tests and then the normal project verification commands.
   - If tests fail after implementation, fix the implementation.
   - Do not arbitrarily rewrite tests to match the implementation.

## Limited test revision after implementation

Tests may be changed after implementation only when repeated failures show that the initial test was wrong because of:

- a logical mismatch with the spec,
- an ambiguity resolved by updating the spec,
- or a verified environment/tooling issue.

When this happens, update the related spec or work notes with the reason for the test revision.

## Parallel agent roles

When practical, split work across focused agents:

- **Spec steward** — updates `spec/` and acceptance criteria.
- **Test author** — creates/updates tests from specs and proves All Red.
- **Implementer** — changes production code to reach All Green.
- **Reviewer** — checks spec compliance, test validity, and code quality.

Spec writing and test writing may run in parallel with planning. Implementation starts only after the relevant All Red gate is observed.
