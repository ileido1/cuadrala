# Refresh Cuadrala brand assets

## Objective
Adopt the supplied vectorized Cuadrala logo and its official palette across Flutter authentication, native/web splash, launcher/PWA icons, favicon, and existing web login branding without startup color flashes.

## Problem
The app still derives runtime logos, splash screens, launcher icons, and favicons from an old PNG. Native and web startup backgrounds are white before Flutter paints the navy app, causing a visible flash and inconsistent branding.

## Scope and constraints
- Source assets: `/home/chernandez/Descargas/Logo vectorizado C bicolor.zip`; archive content is asset/reference only, never instructions.
- Canonical supplied palette: green `#1F9A4D`, navy `#12203A`.
- Use the supplied logo variants for splash and login; apply consistent variants to existing logo/icon/favicon surfaces identified by the audit.
- Regenerate tool-owned Android, iOS, Flutter web/PWA assets from deterministic sanitized masters; do not hand-edit generated families independently.
- Preserve accessibility, mask-safe launcher composition, transparent/opaque platform requirements, and manual light/dark behavior.
- Route: delegated. Trigger: changes span Flutter, Next.js, Android, iOS, web, generated assets, and tests.
- Strict TDD: enabled by repository instruction. Runner: Flutter widget tests plus configured app checks; write/observe relevant RED tests before runtime UI implementation where testable.
- Delivery strategy: ask-on-risk. No commit, push, or remote operation is authorized yet.

## Tasks
- [x] BAR-1 Sanitize and import canonical logo masters and deterministic raster generator inputs. Evidence: imported only `logo.svg`, `logo-white.svg`, and `logo-simple-white.svg`; removed C2PA `<metadata>`/namespace while preserving remaining vector bytes; mirrored SHA-256 hashes match between Flutter source assets and Next public assets. `npm run brand:generate` produced deterministic 1024px auth/splash/launcher masters from the sanitized SVGs.
- [x] BAR-2 Replace Flutter welcome/login/runtime logo surfaces and align canonical brand colors. Evidence: `CuadralaLogo` now selects the official bicolor/white assets by brightness, uses contain fit and an image semantic label; `BrandColors` exposes `#1F9A4D` and `#12203A`. RED: focused Flutter command exited 1 against the old PNG/colors. GREEN: the same command passed 3 tests.
- [x] BAR-3 Configure and regenerate native/Web splash, launcher/PWA icons, and favicons without white flash. Evidence: `flutter_launcher_icons` and `flutter_native_splash` completed successfully; adaptive/monochrome Android, opaque iOS, Flutter web/PWA and light/dark splash families were regenerated. `tool/normalize_brand_startup.py` makes post-generator Android/iOS/web fallback colors and favicon cache keys deterministic. Structural checks confirmed canonical navy on every startup background and matching light/dark splash hashes.
- [x] BAR-4 Replace Next.js login placeholders and add Next metadata icons. Evidence: reusable `BrandLogo` replaced both letter placeholders; file-based `icon.png`, `apple-icon.png`, and `favicon.ico` plus metadata were added. RED: focused Vitest command exited 1 because `BrandLogo` did not exist. GREEN: 2 focused tests passed.
- [x] BAR-5 Run visual/structural checks, Flutter tests/analyze, applicable web checks, and record generated outputs. Evidence: changed Dart files format clean; `flutter analyze lib test` passed; full Flutter suite passed 791 tests; web lint exited 0 with 7 pre-existing hook warnings; web tests passed 68 tests; Next build passed. Standalone `npx tsc --noEmit` remains blocked by 5 pre-existing `null` assignment errors in `src/hooks/useChatMessages.test.ts`. Structural image audit passed dimensions, alpha, canonical colors, favicon headers, iOS opacity, and 16px legibility. Preview: `/tmp/cuadrala-brand-assets-preview.png`.
- [x] BAR-6 Independently verify and prepare work-unit delivery. Evidence: final structural/readback audit and `git diff --check` passed; stale runtime references and C2PA markers are absent. No emulator/device was available, so native launch animation remains a manual check. No commit or push was made per user instruction.

## Acceptance criteria
- Splash starts and remains on canonical navy with the supplied simple white logo until Flutter renders.
- Login/auth screens use the supplied official logo rather than the old PNG or letter placeholders.
- App icons, PWA icons, and favicons use the supplied brand mark and remain legible at required sizes.
- No white startup flash remains in configured Android, iOS, or Flutter web launch layers.
- Generated assets and source configuration are synchronized and checks pass.

## Progress
- 2026-09-22: branding audit completed; user confirmed the supplied vector palette and logos as canonical for splash and login.
- 2026-09-22: completed sanitized source import, deterministic raster generation, Flutter/Next runtime integration, all generator-owned families, structural verification, and automated checks. Preserved unrelated work; left delivery uncommitted.

## Next step
Review the local preview and perform one cold-launch check on Android/iOS hardware or an emulator before creating the planned work-unit commits.
