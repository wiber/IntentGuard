# Alignment Proposal AP-001: Test Infrastructure Drift

**Priority:** CRITICAL
**Drift Percentage:** 78% (60 of 77 test files unreachable by configured runner)
**Patent Reference:** IAMFIM geometric auth — audit trail integrity depends on verifiable test claims
**Date:** 2026-02-15
**Author:** Recursive Documentation Mode (Proactive Protocol)

---

## What the Spec Says

The migration spec (`intentguard-migration-spec.html` v2.5.0) makes these test claims:

| Module | Spec Claim | Source |
|--------|-----------|--------|
| FIM Geometric Auth | "44 passing tests (commit 0185ae5)" | Section: IAMFIM |
| OpenClaw Plugin | "16 tests passing (commit db0a04a)" | Section: IAMFIM |
| Voice Memo Reactor | "438 LOC tests" | Section: Skills Inventory |
| Claude Flow Bridge | "596 LOC tests" | Section: Skills Inventory |
| System Control | "433 LOC tests" (80+ test cases) | Section: Skills Inventory |
| LLM Controller | "378 LOC tests" | Section: Skills Inventory |
| Pipeline Step 3 | "step-3.test.ts" done | Section: Trust-Debt Pipeline |
| Pipeline Step 6 | "step-6.test.ts" done | Section: Trust-Debt Pipeline |
| Federation Registry | "75/76 tests passing" | Section: Phase 8 |

The spec marks FIM auth as "production ready" and multiple skills as "done" based on these test counts.

## What the Code Does

### Jest Configuration (`config/jest.config.js`):
```js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/../tests'],      // <-- Points to tests/ directory
  testMatch: ['**/*.test.js'],         // <-- Only matches .js files
  // ...
};
```

### Actual Test File Locations:
- **`tests/` directory:** 17 JavaScript test files (`.test.js`) — REACHABLE by `npm test`
- **`src/` directory:** 60 TypeScript test files (`.test.ts`) — UNREACHABLE by `npm test`

### Specific Disconnects:

| File | Location | Reachable by `npm test`? |
|------|----------|--------------------------|
| geometric.test.ts | src/auth/ | NO |
| plugin.test.ts | src/auth/ | NO |
| voice-memo-reactor.test.ts | src/skills/ | NO |
| claude-flow-bridge.test.ts | src/skills/ | NO |
| system-control.test.ts | src/skills/ | NO |
| llm-controller.test.ts | src/skills/ | NO |
| step-3.test.ts | src/pipeline/ | NO |
| step-6.test.ts | src/pipeline/ | NO |
| federation/registry.test.ts | src/federation/ | NO |
| step-4.test.js | tests/pipeline/ | YES |

The `geometric.test.ts` file actually contains **53 test cases** (more than the claimed 44), but since it's TypeScript in `src/` and the jest config only scans `tests/*.test.js`, running `npm test` never touches it.

## Why This Is Critical

1. **Trust Debt Pipeline Integrity**: The entire system is built on auditable, verifiable claims. Unrunnable tests are unverifiable claims — the definition of trust debt.

2. **Spec Legitimacy**: Marking modules as "production ready" or "done" based on test counts that can't be reproduced by `npm test` undermines the spec's credibility.

3. **Two Test Ecosystems**: The codebase has silently split into legacy JS tests (in `tests/`) and modern TS tests (in `src/`). Neither system knows about the other.

4. **CI/CD Gap**: Any future CI pipeline using `npm test` will only validate 17/77 test files (22%).

## Concrete Patch

### Option A: Unified TypeScript Runner (Recommended)

Update `config/jest.config.js` to find both test locations and handle TypeScript:

```js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/../tests', '<rootDir>/../src'],
  testMatch: ['**/*.test.js', '**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: false }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.js',
    '!src/**/*.test.ts',
    '!src/**/*.test.js',
    '!src/**/*.example.ts',
  ],
  coverageDirectory: '../reports/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
};
```

**Required dependency:** `npm install --save-dev ts-jest @types/jest`

### Option B: TSX-based Test Runner (Minimal Change)

Add parallel npm scripts that use the existing `tsx` devDependency:

```json
{
  "test:auth": "npx tsx --test src/auth/*.test.ts",
  "test:pipeline": "npx tsx --test src/pipeline/*.test.ts",
  "test:skills": "npx tsx --test src/skills/*.test.ts",
  "test:federation": "npx tsx --test src/federation/*.test.ts",
  "test:all": "npm run test && npm run test:auth && npm run test:pipeline && npm run test:skills && npm run test:federation"
}
```

### Option C: Migrate Tests to `tests/` (Most Disruptive)

Move all 60 `.test.ts` files from `src/` to `tests/`, compile them, and let jest find them. Not recommended — colocated tests are the modern pattern.

## Recommendation

**Option A** is the correct fix. It:
- Makes `npm test` discover all 77 test files
- Validates the spec's "44 passing tests" claim in one command
- Enables CI/CD with full coverage
- Keeps colocated TypeScript tests in `src/`

## Drift Classification

| Dimension | Score |
|-----------|-------|
| Severity | CRITICAL — core auditability claim is hollow |
| Blast Radius | HIGH — affects every "done" badge in the spec |
| Fix Complexity | LOW — single config file + one dev dependency |
| Reversibility | HIGH — pure additive change |

**Net Assessment:** High-value, low-risk fix. Should be the next commit.

---

*Generated by Recursive Documentation Mode — Proactive Protocol*
*IntentGuard v1.8.3 | Migration Spec v2.5.0*
