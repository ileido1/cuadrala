# Skill Registry — Cuadrala

Generated: 2026-05-16 (sdd-init)

## User Skills (`~/.cursor/skills/`, `~/.codex/skills/`)

### branch-pr
- **Trigger**: creating, opening, or preparing PRs for review.
- **Path**: `~/.cursor/skills/branch-pr/SKILL.md`
- **Rules**: Issue-first checks. Conventional commits. Link related issues. Keep PRs reviewable.

### chained-pr
- **Trigger**: PRs over 400 lines, stacked PRs, review slices.
- **Path**: `~/.cursor/skills/chained-pr/SKILL.md`
- **Rules**: Split oversized changes into chained PRs. Each slice independently reviewable.

### cognitive-doc-design
- **Trigger**: guides, READMEs, RFCs, onboarding, architecture docs.
- **Path**: `~/.cursor/skills/cognitive-doc-design/SKILL.md`
- **Rules**: One concept per section. Progressive disclosure. Concrete examples before abstractions.

### comment-writer
- **Trigger**: PR feedback, issue replies, reviews, Slack/GitHub comments.
- **Path**: `~/.cursor/skills/comment-writer/SKILL.md`
- **Rules**: Warm, direct tone. Specific examples. No vague praise.

### go-testing
- **Trigger**: Go tests, coverage, teatest, golden files.
- **Path**: `~/.cursor/skills/go-testing/SKILL.md`
- **Rules**: Table-driven tests. Golden files for complex output. (Not primary stack for Cuadrala.)

### issue-creation
- **Trigger**: GitHub issues, bug reports, feature requests.
- **Path**: `~/.cursor/skills/issue-creation/SKILL.md`
- **Rules**: Check duplicates. Reproduce before reporting. Include environment context.

### judgment-day
- **Trigger**: dual review, adversarial review, juzgar.
- **Path**: `~/.cursor/skills/judgment-day/SKILL.md`
- **Rules**: Blind dual review. Fix confirmed issues only. Re-judge after fixes.

### skill-creator
- **Trigger**: new skills, agent instructions.
- **Path**: `~/.cursor/skills/skill-creator/SKILL.md`
- **Rules**: LLM-first skills: Activation Contract, Hard Rules, Decision Gates, Output Contract. 180–450 body tokens.

### work-unit-commits
- **Trigger**: commit splitting, chained PRs, tests/docs with code.
- **Path**: `~/.cursor/skills/work-unit-commits/SKILL.md`
- **Rules**: Commits as reviewable units. Tests travel with code. Each commit should pass CI.

### SDD skills (sdd-init … sdd-archive)
- **Trigger**: `/sdd-init`, `/sdd-explore`, `/sdd-propose`, `/sdd-spec`, `/sdd-design`, `/sdd-tasks`, `/sdd-apply`, `/sdd-verify`, `/sdd-archive`
- **Path**: `~/.cursor/skills/sdd-*/SKILL.md`
- **Rules**: Artifacts under `openspec/changes/{change}/` or Engram `sdd/{change}/{artifact}`. Never skip schema read for MCP tools. Hybrid mode: files + Engram.

## API Skills (`services/api/.agents/skills/`)

### prisma-cli / prisma-client-api / prisma-database-setup / prisma-postgres
- **Trigger**: Prisma CLI, queries, DB setup, Postgres provisioning.
- **Rules**: Run `prisma generate` after schema changes. Client output at `src/generated/prisma`. Migrations via `npx prisma migrate dev`.

### nodejs-backend-patterns / nodejs-express-server / nodejs-best-practices
- **Trigger**: Express API, middleware, routing, server architecture.
- **Rules**: Skinny controllers. Composition root in presentation. Async error handling via middleware.

### vitest / zod / typescript-advanced-types
- **Trigger**: API tests, Zod schemas, advanced TS types.
- **Rules**: Vitest sequential (`maxWorkers: 1`). Contract tests without DB; integration needs `TEST_DATABASE_URL`. Zod in presentation validation.

## Web Skills (`apps/web/.agents/skills/`)

### next-best-practices / next-cache-components / next-upgrade
- **Trigger**: Next.js App Router, caching, upgrades.
- **Rules**: Respect RSC boundaries. PPR/cache components per Next 16 patterns when upgrading.

### react-best-practices / composition-patterns / react-hook-form
- **Trigger**: React performance, component APIs, forms.
- **Rules**: Prefer composition over boolean props. RHF for client forms; Zod resolvers.

### vitest / tailwind-css-patterns / accessibility / seo / frontend-design
- **Trigger**: web tests, Tailwind layout, a11y, SEO, UI polish.
- **Rules**: Vitest + Testing Library for units. WCAG 2.2 AA. Distinctive UI, not generic AI aesthetic.

## Mobile Skills (`apps/mobile/.agents/skills/`)

### flutter-expert / flutter-testing / flutter-animations / dart-best-practices
- **Trigger**: Flutter widgets, tests, animations, Dart style.
- **Rules**: Prefer Cubit over Bloc. `tearDown(() => cubit.close())`. const widgets. Feature-first layout under `lib/src/features/`.

### accessibility / frontend-design / seo / bash-defensive-patterns
- **Trigger**: a11y, UI design, SEO, shell scripts.
- **Rules**: Match Cuadrala design tokens. `set -Eeuo pipefail` in bash.

## Project Convention Files

- `AGENTS.md` — Monorepo overview, commands, architecture, TDD orchestrator
- `docs/SDD.md` — Product spec and user stories
- `openspec/config.yaml` — SDD config, strict TDD, testing capabilities
- `.cursor/agents/orchestrator.md` — Spec-driven + TDD DAG workflow
- `.cursor/rules/clean-architecture.mdc` — API layer dependency rule
- `.cursor/rules/naming-conventions.mdc` — SV/CON/DVAL/FVAL, `_params`, UPPERCASE constants
- `.cursor/rules/tdd-guidelines.mdc` — Red-Green-Refactor, integration test patterns
- `.cursor/rules/flutter-bloc.mdc` — Cubit/Bloc, testing
- `.cursor/rules/code-comments.mdc` — Spanish comments (API)
- `.cursor/rules/use-orchestrator.mdc` — Default orchestrator for features/fixes
