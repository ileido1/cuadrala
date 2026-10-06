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
- Route: SDB-3 was implemented direct inline. SDB-5 uses delegated direct because the TLS fix must update the shared `pg`/Prisma adapter path and its callers; a read-only CodeGraph map confirmed the affected setup. Remote MCP operations remain parent-owned.
- TDD: enabled by `AGENTS.md` and `.cursor/rules/tdd-guidelines.mdc`; runner `services/api: npm test`. SDB-3 used a focused Node assertion with installed `js-yaml` for RED/GREEN. SDB-5 must test the shared adapter TLS config RED/GREEN, then run required API checks in order: `npm run typecheck`, `npm run lint`, `npm test`.
- Receipt-driven development: disabled globally (`gentle-ai review mode status`); no native reviews, ordinary checks only.
- Delivery: `ask-on-risk`; forecast remains under 400 authored source lines, generated CA file excluded. No PR or chain is authorized/requested.

## Tasks

- [x] **SDB-1 — Provision the fresh Supabase project.** Created `cuadrala-api-db` (`fdfetrasjiwsdqcokgnq`) in the approved organization and `us-west-1`; Supabase reports `ACTIVE_HEALTHY`. `public` has no tables. Selected the Supavisor session pooler on port 5432: Render is IPv4-only and Supabase documents this mode for server-based Prisma deployments and `DATABASE_URL` migrations. References: [Supabase Prisma](https://supabase.com/docs/guides/database/prisma), [Supabase IPv4/IPv6 compatibility](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP). Check passed: project status/region match and public schema is empty.
- [ ] **SDB-2 — Apply schema and fixtures.** Migrations are applied and verified (74/74); seed currently fails at the first `Sport.upsert` with P1011 because node-postgres rejects the Supabase TLS certificate chain. Re-run the existing seed only after SDB-5 is deployed; verify expected QA fixture counts.
- [x] **SDB-3 — Point Render and Blueprint to Supabase.** Render `DATABASE_URL` now points at Supabase; `render.yaml` preserves the external secret and the old Render DB resource without wiring it to the API. Focused YAML assertion observed RED before the edit and GREEN after; `npm run typecheck`, `npm run lint`, and `npm test` all passed in order.
- [x] **SDB-4 — Deploy and smoke test.** Initial deploy `dep-db2ho50m7kps73etoli0` was live; the restored-command deploy `dep-db2htuoae00c73ae1o90` is also live. `/api/v1/health` returned HTTP 200 after restoration. Initial logs report all migrations applied and the TypeScript build successful.
- [x] **SDB-5 — Trust Supabase's CA in node-postgres Prisma scripts.** Added Supabase's public Root 2021 CA and centralized Pool/PrismaPg construction in `services/api/src/infrastructure/prisma_pg_adapter.ts`. The helper strips conflicting TLS URL options and supplies the CA only for Supabase hosts with `rejectUnauthorized: true`; non-Supabase hosts keep their original config. Seed and all four maintenance scripts now use it. A focused test observed behavioral RED before the host-scoped fix and GREEN afterward. `npm run typecheck`, `npm run lint`, and `npm test` passed in order (185 files, 1,049 tests). Work-unit commit: pending.
- [ ] **SDB-6 — Deploy the TLS fix and finish the one-time seed.** Deploy the authorized source change, temporarily append the seed to Render's build command, restore the exact original command immediately afterward, then verify fixture counts and service health. No seed on routine builds.

## Progress and evidence

- Repository mapping confirmed generic PostgreSQL schema, 74 migrations, 9 SQL migrations with DML/backfills, and seed password resets limited to fixed test accounts.
- Supabase account has exactly one organization; new-project cost returned `$0/month` and the user confirmed the project, price, name, and region.
- Render service is in Oregon; Supabase project `fdfetrasjiwsdqcokgnq` is `ACTIVE_HEALTHY` in `us-west-1`; `public` has no tables.
- Supabase Prisma guidance says use a dedicated `prisma` DB role and Supavisor Session pooler (port 5432) for server-based deployments; Render does not support IPv6, so direct connection is not suitable.
- Created the dedicated `prisma` login role and granted `USAGE, CREATE` on `public`; its random password was not written to the repository or task record.
- Local `psql` resolved the Supavisor hostname but timed out opening TCP port 5432 to both returned IPv4 addresses. Render's build network was used instead; its latest deploy applied all migrations successfully.
- Current Supabase guidance says a Free project with low activity may pause after 7 days; a few daily requests usually prevent this but are not guaranteed. Reference: [Supabase Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing). The user approved the $0/month project creation, not a paid upgrade.
- User explicitly accepted proceeding with Supabase Free despite the inactivity-pause risk; no paid plan or upgrade is authorized.
- Set Render service `DATABASE_URL` to the Supavisor session pooler without returning or recording the secret. Deploy `dep-db2ho50m7kps73etoli0` reached `live`; SQL verification confirms all 74 `_prisma_migrations` records finished; health returned HTTP 200.
- Blueprint validation passed with `js-yaml`; checks passed: `npm run typecheck` (exit 0), `npm run lint` (exit 0), and `npm test` (184 files, 1,047 tests passed). No source/API test failure was observed.
- Latest Render restoration deploy `dep-db2htuoae00c73ae1o90` is `live`; `/api/v1/health` returned HTTP 200 at 2026-10-06T16:21:15Z. Its build command is restored to the original migration-and-build command, without a persistent seed suffix.
- Seed failure evidence: Render deploy `dep-db2hsmks728c73cgn330` returned Prisma P1011 `self-signed certificate in certificate chain` at `services/api/prisma/seed.ts:78`. The official Supabase root CA `prod-ca-2021.crt` was downloaded from Database Settings; its subject/issuer are `Supabase Root 2021 CA`, and it is valid through 2031. node-postgres docs confirm that connection-string SSL options override a programmatic `ssl` object, so the shared adapter helper must strip those options before setting `ssl.ca`.
- Supabase table listing emitted a critical security advisory: 49 public tables have RLS disabled and are exposed to `anon`/`authenticated`. No RLS changes were made because enabling RLS without a designed policy set could block expected access; treat as separate security follow-up.
- Current API health verification passes after restoring the Render Build Command. Seed and post-fix deployment remain pending.
- SDB-5 local fix verified: `services/api/src/test/unit/prisma_pg_adapter.test.ts` covers Supabase CA trust, removal of overriding URL TLS parameters, and preserving local database SSL behavior. The full suite's local PostgreSQL child-process test exposed the latter requirement; after scoping the CA to Supabase hostnames, all 185 test files / 1,049 tests passed. No real Supabase connection test has run from this workstation because outbound PostgreSQL TCP is unavailable; Render verification is still required.
- The Render Shell route is gated behind a paid Starter plan, which was not selected. The current one-time seed will instead use the previously authorized temporary build-command append followed immediately by restoring the exact original command; no persistent automatic seed is intended.
- SDB-1 work-unit commit: `ef259d47a342f89f1cfff1db1e5bd8352ac0cc25` (plan plus verified provisioning evidence).

## Next step

SDB-5 is locally complete; record its work-unit commit after committing. The code cannot reach Render until an explicitly authorized push/deploy; do not push the feature branch or change `main` without explicit scope authorization. Once deployment is authorized, run SDB-6 and verify seed fixtures. Separately resolve the RLS exposure with a deliberate policy design; do not enable RLS blindly.
