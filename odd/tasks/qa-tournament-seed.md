# QA tournament seed

## Objective and why
Populate existing Prisma cuadrala-qa with sports, test accounts, and seven usable tournament scenarios to exercise player and organizer flows. Remote evidence: Sport=0, Tournament=0, User=1; previous deployment only ran migrations. Existing seed creates no tournaments.

## Authorized scope and constraints
User authorizes inspection/improvement of services/api/prisma/seed.ts and execution on the existing disposable QA Prisma database db_hb57idoke14l2takf41z77bg/project proj_n5ujxkhyf4rt874n2r1dulc5 through the already-authorized Prisma session/direct connection. No old Render DB changes, deletion of unrelated data, remote code push/deploy, or API feature expansion. Preserve existing real user and manual QA progress on reruns. Never persist connection secrets.

## Tasks
- [x] T1 — Fix bounded seed inconsistencies: TENNIS code, E.164/numeric profile fixtures, stable match identity, payment methods only for seed venues, and compatible tennis court. Include failing regression tests and verify. Route delegated: mapping/preparation spans 4+ files; multi-file writer required.
- [ ] T2 — Add seven OPEN PUBLIC tournament fixtures, coherent individual/pair registrations and QA users/invitations, document manual scenarios and credentials; verify then execute seed twice against QA and check counts/progression preservation. Route delegated implementation plus parent inline remote execution; remote destination explicitly authorized by user.

## Acceptance matrix
AMERICANO/PADEL individual rotating partners (4 confirmed); ROUND_ROBIN, SINGLE_ELIMINATION, GROUPS_PLUS_KNOCKOUT/TENNIS individual (4 confirmed each); the latter three formats/PADEL fixed doubles (8 confirmed/4 symmetric pairs each). Native generators/materialization support these modes. Use actual presets and valid format config. Seed tournaments OPEN without pre-generated schedules so organizer can generate/assign/start/score via real flows. Dates future and nonconflicting. Existing organizers/players remain, add player7/8. Provide pending/invited/guest/free-to-join scenarios on non-Americano singles fixtures without duplicate active participant identity. Preserve tournament statuses, dates, and registrations on rerun.

## Checks and delivery
TDD ON: source AGENTS.md and .cursor/rules/tdd-guidelines.mdc. Runner npm test -- <focused test>; observe RED before source edits then GREEN/refactor. Required API order npm run typecheck -> npm run lint -> npm test; DB integration tests unavailable unless dedicated TEST_DATABASE_URL supplied (do not silently use QA for destructive integration tests). Runtime evidence: npm run seed twice on authorized QA, SQL fixture counts/relations and read-only live HTTP sports/tournaments checks where supported. Full interactive player/organizer UI journey is not implied by seed coverage; report unverified flows honestly.
RDD disabled/unmanaged (global OFF); no receipt reviews. Delivery strategy ask-on-risk; forecast 310-390 authored lines total including tracking/tests/docs; ~400 advisory threshold, no artificial code shrinking. No push/PR requested. Branch codex/qa-tournament-seed; base 265806e (onboarding changes already committed locally).
Rollback: revert seed/helper/tests/README task commits locally; remote seed is additive and only seed-owned fixture cleanup may be proposed separately, not automatically executed.

## Progress and evidence
Exploration completed by delegated worker; all seven supported modality combinations verified. T1 implemented and verified. Observed RED: missing TENNIS v2 assertion; GREEN: DB-free repeated-seed regression 1 passed, including manual match status/date and unrelated user preservation. Node22.22.0: npm run typecheck passed -> npm run lint zero errors -> TEST_DATABASE_URL='' npm test 818 passed/228 skipped (125 files passed/59 skipped). Integration skips intentional: no dedicated DB. Remote seed not executed yet; T2 pending.
Next step: commit T1, release bounded writer for T2; parent executes verified seed using secret held only in tool memory.
