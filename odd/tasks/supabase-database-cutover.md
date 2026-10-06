# Supabase database cutover

## Objective

Move the Render-hosted Cuadrala API to a new, empty Supabase PostgreSQL project while retaining Prisma, applying the checked-in migrations and seed, and keeping the connection configuration reproducible. Do not copy records from the current database.

## Problem and rationale

The current deployment has had database connectivity and seed failures. Supabase is PostgreSQL-compatible, so the smallest path is to keep Prisma and change the database target, rather than rewrite data access.

## Authorized scope and constraints

- User authorized a new database with no current records, migrations, seed, and backend environment update.
- Use the only existing organization in the connected Supabase account. One organization was found.
- Create project `cuadrala-api-db` in `us-west-1`, nearest available Supabase region to the Render API in Oregon. Supabase reported project creation at `$0/month`; user explicitly confirmed that cost and selection.
- No data export/import. Leave the current database untouched. Run the existing seed only against the new empty project; it creates QA fixtures and resets fixture passwords.
- Keep credentials out of Git and task artifacts. Do not disclose database URLs in chat.
- The Render service is `cuadrala-api` (`srv-dacenm2fngtc73d73pvg`); its Blueprint currently points `DATABASE_URL` at Render Postgres. Reconcile that drift without committing secrets.
- Preserve unrelated untracked `.codegraph/` and `apps/mobile/test/features/tournaments/goldens/failures/`.

## Acceptance criteria

- A healthy, isolated Supabase project exists in the approved organization and region.
- All existing Prisma migrations are recorded as applied; the existing seed completes on the fresh target and only seed fixtures are present.
- Render's API service uses the Supabase connection at runtime/build, and the checked-in Blueprint no longer silently wires the old Render database.
- The deploy reaches `live`; `/api/v1/health` succeeds and logs show no database startup/migration error.
- No rows from the previous database were copied or changed.

## Resolved workflow

- Branch: `codex/supabase-database-cutover` (created from the clean `codex/full-capacity-main`, which matched `origin/main`).
- Route: direct inline for implementation; remote MCP operations are performed by the parent. The 4+ file mapping trigger fired and was handled by a delegated read-only mapper before this plan. The writer trigger did not fire: the only planned non-trivial source edit is root `render.yaml`.
- TDD: enabled by `AGENTS.md` and `.cursor/rules/tdd-guidelines.mdc`; runner `services/api: npm test`. For the Blueprint-only change, use a focused Ruby stdlib YAML assertion to observe RED/GREEN, then run the required API checks in order: `npm run typecheck`, `npm run lint`, `npm test`.
- Receipt-driven development: disabled globally (`gentle-ai review mode status`); no native reviews, ordinary checks only.
- Delivery: `ask-on-risk`; forecast is under 400 authored source lines (one small Blueprint env wiring change). No PR or chain is authorized/requested.

## Tasks

- [x] **SDB-1 — Provision the fresh Supabase project.** Created `cuadrala-api-db` (`fdfetrasjiwsdqcokgnq`) in the approved organization and `us-west-1`; Supabase reports `ACTIVE_HEALTHY`. `public` has no tables. Selected the Supavisor session pooler on port 5432: Render is IPv4-only and Supabase documents this mode for server-based Prisma deployments and `DATABASE_URL` migrations. References: [Supabase Prisma](https://supabase.com/docs/guides/database/prisma), [Supabase IPv4/IPv6 compatibility](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP). Check passed: project status/region match and public schema is empty.
- [ ] **SDB-2 — Apply schema and fixtures.** Run the 74 checked-in Prisma migrations using a migration-compatible Supabase endpoint, then run the existing seed. Check: Prisma reports no pending migrations; seed exits successfully; expected QA fixture counts are present.
- [ ] **SDB-3 — Point Render and Blueprint to Supabase.** Set only `DATABASE_URL` on the authorized API service; change root `render.yaml` to preserve an externally managed secret instead of referencing Render Postgres. Check: targeted YAML RED/GREEN, then API typecheck, lint, and tests in the required order.
- [ ] **SDB-4 — Deploy and smoke test.** Allow/trigger the Render deploy as appropriate; verify it is live, check health endpoint and recent logs, and record the resulting commit/deploy evidence.

## Progress and evidence

- Repository mapping confirmed generic PostgreSQL schema, 74 migrations, 9 SQL migrations with DML/backfills, and seed password resets limited to fixed test accounts.
- Supabase account has exactly one organization; new-project cost returned `$0/month` and the user confirmed the project, price, name, and region.
- Render service is in Oregon; Supabase project `fdfetrasjiwsdqcokgnq` is `ACTIVE_HEALTHY` in `us-west-1`; `public` has no tables.
- Supabase Prisma guidance says use a dedicated `prisma` DB role and Supavisor Session pooler (port 5432) for server-based deployments; Render does not support IPv6, so direct connection is not suitable.
- No migrations, seed, Render environment update, or deploy has run.

## Next step

Create the documented custom `prisma` DB role with a securely generated password, then run and verify the existing Prisma migrations and seed against this fresh project.
