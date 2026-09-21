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
