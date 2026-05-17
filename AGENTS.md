# AGENTS.md — Cuadrala

## Project Overview

Monorepo with two packages:
- **`apps/mobile`** — Flutter app (Android/iOS/Web), SDK ^3.9.2
- **`services/api`** — Node.js/TypeScript Express API, Prisma 6/7, PostgreSQL

Dev environment: **Ubuntu**.

## Developer Commands

### API (`services/api/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start server in watch mode (`tsx watch src/main.ts`) |
| `npm run build` | Compile to `dist/` (`tsc -p tsconfig.build.json`) |
| `npm run start` | Run `dist/main.js` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (JSON output) |
| `npm test` | Vitest run (contract tests by default; integration skipped without `TEST_DATABASE_URL`) |
| `npm run test:watch` | Vitest watch mode |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:validate` | Validate Prisma schema without DB |
| `npm run seed` | Seed DB: PADEL sport, AMERICANO/ROUND_ROBIN presets, default FeeRule (idempotent) |
| `npx prisma migrate dev` | Apply migrations (requires `DATABASE_URL`) |

**Required order for verification:** `typecheck` → `lint` → `test`

**Critical:** `postinstall` runs `prisma generate` automatically. After changing `prisma/schema.prisma`, run `npx prisma generate` before the app will compile.

### Mobile (`apps/mobile/`)

| Command | Description |
|---------|-------------|
| `flutter pub get` | Install dependencies |
| `flutter run` | Run on connected device/emulator |
| `flutter analyze` | Static analysis (lint) |
| `flutter test` | Run all tests |
| `flutter test test/path/to/file_test.dart` | Run a single test file |

## Architecture

### API — Clean Architecture (layered, dependency inversion)

**Canonical guide:** [`services/api/ARCHITECTURE.md`](services/api/ARCHITECTURE.md) — layer rules, domain tree, composition root, gold/anti patterns, migration waves, controller debt manifest.

si```
src/domain/          → Entities, Value Objects, Repository/Service interfaces (zero external deps)
src/application/     → Use Cases, DTOs (only imports domain)
src/infrastructure/  → Prisma repos, external APIs, bcrypt/JWT (implements domain interfaces)
src/presentation/    → Express routers, controllers, Zod schemas (composition root / DI wiring)
src/generated/prisma → Auto-generated Prisma client (DO NOT edit)
```

**Inviolable rule:** `domain` and `application` must NEVER import from `infrastructure` or `presentation`. Infrastructure implements domain interfaces; presentation wires everything together.

Prisma client output is configured to `src/generated/prisma` (not the default `node_modules`).

**Active refactor:** `openspec/changes/api-architecture-refactor/` (Wave 0–6). Do not add `application/*.service.ts` or `infrastructure/repositories/` for new code.

### Mobile — Feature-first with BLoC

```
lib/src/
  app/          → App-level config, theme
  core/         → Shared utilities, DI (get_it), network (dio)
  features/     → Feature modules (each with presentation + business + data)
  router/       → GoRouter configuration
  shared/       → Shared widgets
```

**State management:** Prefer `Cubit` over `Bloc`. Use `Bloc` only when event traceability or complex event processing is needed. States are sealed classes or single class with status enum, always extend `Equatable`.

## Testing

### API
- **Vitest** with `fileParallelism: false`, `maxWorkers: 1` (sequential execution).
- Contract tests (Zod validation + HTTP 400 responses) run by default — no DB needed.
- Integration tests require `TEST_DATABASE_URL` env var pointing to a dedicated test DB with migrations applied (`npx prisma migrate deploy`).
- Test files live in both `src/test/` and `tests/`.
- `pretest` script runs `scripts/pretest.mjs` before vitest.

### Mobile
- `flutter_test` + `bloc_test` + `mocktail` for unit/widget tests.
- Always `tearDown(() => cubit.close())` in bloc tests.
- Use `registerFallbackValue()` for custom types with mocktail.

## Environment Setup

### API
- Copy `.env.example` to `.env` in `services/api/`.
- **Required:** `DATABASE_URL` (PostgreSQL connection string).
- **Required for auth:** `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (>= 32 chars in production).
- **Optional for integration tests:** `TEST_DATABASE_URL`.
- Node **20.19+** required.

### Mobile
- Run `flutter pub get` after dependency changes.
- Assets live in `assets/images/`.

## Workflow: Orchestrator (Spec-Driven + TDD)

When implementing features, fixing bugs, or refactoring, use the Orchestrator flow defined in `.cursor/agents/orchestrator.md`:

1. **Explorer** → explore codebase
2. **Proposer** → propose scope/options
3. **Spec Writer** → write spec + acceptance criteria
4. **Designer** → design modules/interfaces
5. **Task Planner** → DAG task plan
6. **Tester** → write failing tests (TDD Red)
7. **Implementer** → make tests pass (TDD Green)
8. **Verifier** → validate; iterate if needed

Exception: skip for trivial changes (typos, comments) or when user explicitly says "do it directly."

## Conventions

- **API code comments:** Spanish (per `.cursor/rules/code-comments.mdc`).
- **API naming:** Service functions end in `SV`, controllers in `CON`, validations in `DVAL`/`FVAL`. Parameters prefixed with `_`. Constants UPPERCASE. (per `.cursor/rules/naming-conventions.mdc`)
- **Mobile:** Follow Effective Dart + flutter_lints. Bloc events in past tense. Public cubit methods return `void` or `Future<void>`.
- **Tests:** TDD Red-Green-Refactor cycle. Name tests with "should [behavior] when [condition]".

## Key References

| File | Purpose |
|------|---------|
| `.cursor/agents/orchestrator.md` | Full orchestrator protocol + DAG |
| `.cursor/rules/clean-architecture.mdc` | API layer rules + DI patterns |
| `.cursor/rules/flutter-bloc.mdc` | BLoC/Cubit implementation + testing guide |
| `.cursor/rules/tdd-guidelines.mdc` | TDD cycle + integration test patterns |
| `.cursor/rules/naming-conventions.mdc` | Naming conventions (API) |
| `.cursor/rules/code-comments.mdc` | Comment style (Spanish) |
| `docs/SDD.md` | Product spec + user stories |
| `services/api/ARCHITECTURE.md` | API Clean Architecture — layers, DI, patterns, migration |
| `services/api/prisma/schema.prisma` | Full DB schema |
| `services/api/README.md` | API endpoints + setup details |
| `openspec/changes/api-architecture-refactor/` | API refactor program (spec, design, tasks) |
