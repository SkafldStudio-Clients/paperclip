# Health Scorecard — Paperclip

> Generated: 2026-05-13 | Commit: f4bed4a7 | Branch: master
> **Health Score: 86/100** (Needs Attention — yellow)

## Structural Health Checks

### Universal Checks

| Category | Check | Status | Notes | Weight |
|---|---|---|---|---|
| Version Control | Git initialized | **PASS** | 2,463 commits | — |
| | .gitignore exists | **PASS** | Comprehensive (node_modules, dist, .env) | — |
| | No secrets committed | **PASS** | No .env files in tracked files | — |
| | Clean working tree | **PASS** | No uncommitted changes | — |
| Testing | Test files exist | **PASS** | 507 test files | — |
| | Tests configured | **PASS** | Vitest + Playwright | — |
| | Coverage configured | **WARN** | No coverage tool configured | -2 |
| CI/CD | Pipeline exists | **PASS** | 6 GitHub Actions workflows | — |
| | CI passing | **PASS** | pr.yml runs typecheck + test + build | — |
| Dependencies | Lock file present | **PASS** | pnpm-lock.yaml | — |
| | Deps pinned | **PASS** | Version ranges specified | — |
| | Dev deps separated | **PASS** | Separate devDependencies in all packages | — |
| Documentation | README exists | **PASS** | Comprehensive 22KB README | — |
| | README current | **PASS** | Modified within current release cycle | — |
| | Contributing guide | **PASS** | CONTRIBUTING.md + AGENTS.md | — |
| Code Quality | Linter configured | **FAIL** | No ESLint, Biome, or Prettier config found | -10 |
| | Formatter configured | **WARN** | No formatter config | -2 |
| | Type checking | **PASS** | TypeScript strict mode, `pnpm -r typecheck` | — |

### Node/TypeScript-Specific Checks

| Check | Status | Notes | Weight |
|---|---|---|---|
| engines field specified | **PASS** | `node: ">=20"`, `packageManager: "pnpm@9.15.4"` | — |
| node_modules in .gitignore | **PASS** | Listed multiple ways | — |
| tsconfig.json present | **PASS** | Root + all packages | — |

### Docker-Specific Checks

| Check | Status | Notes | Weight |
|---|---|---|---|
| .dockerignore exists | **PASS** | Present | — |
| No `latest` tag in FROM | **PASS** | Uses `node:lts-trixie-slim` (floating but not `latest`) | — |

## Score Breakdown

| Deduction | Weight | Reason |
|---|---|---|
| No linter configured | -10 | No ESLint, Biome, or Prettier anywhere in the repo |
| No coverage tool | -2 | Vitest coverage not configured |
| No formatter configured | -2 | No Prettier or Biome formatter config |
| **Total deductions** | **-14** | |
| **Final score** | **86/100** | |

## Top Issues

1. **[CRITICAL] No linter** — With ~491K lines of TypeScript, no linter means no automated style enforcement, no dead-code detection, no import ordering. This is the single biggest gap.
2. **[WARNING] No code coverage** — 507 test files exist but no coverage reporting is configured. Coverage metrics would help identify undertested areas.
3. **[WARNING] No formatter** — No Prettier or Biome formatter means inconsistent code style across 1,644 source files.
4. **[INFO] Floating Docker base tag** — `node:lts-trixie-slim` is a floating alias. Consider pinning to a specific Node version for reproducible builds.
5. **[INFO] Vitest version split** — Root uses `^3.0.5`, some packages use `^3.2.4`. Minor inconsistency.

## Remediation Priority

1. Add ESLint or Biome configuration (linting + formatting in one tool)
2. Configure Vitest coverage reporting
3. Pin Docker base image to specific Node version
4. Align Vitest versions across all packages
