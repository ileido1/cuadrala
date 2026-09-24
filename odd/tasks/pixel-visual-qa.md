# Automated pixel-level visual QA

## Objective
Create a repeatable Playwright-based visual comparison runner for the Flutter web mobile surfaces against the supplied handoff at a fixed phone viewport.

## Problem
Manual browser review confirms the hierarchy, but it does not produce a deterministic pixel diff or a reviewable artifact when spacing, colors, or dimensions drift.

## Scope and constraints
- Use the existing `apps/web` Playwright toolchain; do not add production credentials to the repository or CI.
- Compare the inner phone surface, not the handoff's presentation frame or surrounding desktop canvas.
- Handoff HTML is an external local reference and is passed through an environment variable.
- Dynamic content and authentication are supplied by the operator through a Playwright storage state; no credentials are committed.
- Start with Quick Match's initial configuration state and make the runner extensible by screen name.

## Tasks
- [x] PV-1 Add pixel-diff runner, fixed viewport, handoff capture, target capture, diff image, and JSON report.
- [x] PV-2 Add operator documentation and package script with explicit env requirements.
- [ ] PV-3 Run the comparison against the deployed app, inspect the diff, and record the result.

## Implementation progress
- PV-1/PV-2 authorized on 2026-09-23. Route: delegated direct exploration completed, then inline implementation in the isolated `apps/web` runner/docs surface.
- Scope is limited to `apps/web/scripts/visual-diff.mjs`, `apps/web/package.json`/lockfile, and `apps/web/e2e/README.md` plus focused runner checks. No mobile product code or production credentials.

## Acceptance criteria
- One command captures both sides at the same viewport and produces baseline, target, diff, and metrics artifacts.
- The report contains dimensions, changed pixel count, changed pixel ratio, and threshold/pass status.
- The runner fails clearly when the handoff path, auth state, or target screen is unavailable.
- No production credentials or user data are committed.

## Verification
- `npm run visual:diff -- --help` works without network access.
- The comparison runner can capture the supplied handoff HTML and a production target when `VISUAL_AUTH_STATE` is provided.
- `npm run e2e` remains green.

## Route
Delegated direct exploration completed; implementation is inline because the runner is isolated to `apps/web` scripts/config/docs and does not alter product behavior.

## Verification update
- PV-1/PV-2: `npm run visual:diff -- --help`, `node --check scripts/visual-diff.mjs`, and `git diff --check` passed under Node 20.19.6.
- Runner smoke: using the supplied legacy handoff with `--handoff-selector .cz` and an isolated data URL target produced the expected 402x874 baseline/target/diff/report artifacts. It reported `33658` changed pixels (`0.0957967599`) and failed the default 1% threshold, as expected for intentionally different images.
- The managed Playwright browser was not installed; the runner supports `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` and the smoke used `/usr/bin/google-chrome`, avoiding a browser download.
- PV-3 remains pending until a real authenticated target route and corresponding handoff screen are captured; no production credentials were used.
- Follow-up: normalized the handoff capture to exactly 402x874 and hid the handoff board's sticky header before cropping. A real unauthenticated production run now produces a valid 402x874 report and correctly fails at `0.1238572583` because the target redirects to the welcome screen. Web Playwright smoke tests pass (`3 passed`) with Node 20.19.6 and `/usr/bin/google-chrome`.
