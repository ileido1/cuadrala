# Web E2E smoke tests

The smoke suite runs against a local Next.js dev server and does not require API credentials or production data. It covers the public root redirect, the dashboard auth guard, and basic login-form responsiveness.

## Prerequisites

- Node.js `20.19+` (the repository requirement)
- Dependencies installed with `npm install` from `apps/web`
- Chromium installed for Playwright: `npx playwright install chromium`

Run the suite from `apps/web`:

```bash
npm run e2e
```

The config starts the app on `http://127.0.0.1:3100` with a test-only `NEXTAUTH_SECRET`. Set `PLAYWRIGHT_BASE_URL` when targeting an already-started app instead; the app must be reachable at that URL.

For environments with a managed Chrome installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its absolute path instead of downloading a Playwright browser.

## Authenticated flows

Authenticated tests are intentionally not part of the credential-free smoke suite. A future authenticated flow needs:

- `NEXTAUTH_SECRET` and `NEXTAUTH_URL` for the web app
- `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_API_BASE_PATH` pointing to a test API
- `E2E_AUTH_EMAIL` and `E2E_AUTH_PASSWORD` for a dedicated non-production account, or a pre-generated Playwright storage state
- A running API and isolated test data if the flow performs reads or writes

Never use production credentials or production data in this suite.

## Pixel-level visual diff

The visual runner compares a handoff screen with a target URL at a fixed `402x874` CSS-pixel phone viewport. It writes `baseline.png`, `target.png`, `diff.png`, and `report.json` to `apps/web/visual-artifacts/` (or `VISUAL_OUTPUT_DIR`).

```bash
npm run visual:diff -- \
  --handoff "/absolute/path/to/Cuadrala App.html" \
  --target "https://www.cuadrala.app/#/quick-match"
```

The handoff screen is selected by a substring in `data-screen-label`; the default is `02 Configurar`. For the supplied legacy prototype, which predates that attribute, select the phone content explicitly:

```bash
npm run visual:diff -- \
  --handoff "/absolute/path/to/Cuadrala App.html" \
  --handoff-selector ".cz" \
  --target "https://www.cuadrala.app/#/quick-match"
```

Use `--screen-label`, `VISUAL_SCREEN_LABEL`, or `VISUAL_HANDOFF_SELECTOR` to select another screen. `VISUAL_AUTH_STATE` may point to a local Playwright storage-state JSON when the target route requires authentication. Do not commit that file or production credentials.

If Playwright's managed browser is not installed, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing Chrome/Chromium binary; the runner does not download browsers automatically.

The command prints the changed pixel count, changed pixel ratio, threshold, and `PASS`/`FAIL`; it exits non-zero when the ratio exceeds `VISUAL_MAX_DIFF_RATIO` (default `0.01`). Use `npm run visual:diff -- --help` for the complete option and environment reference.
