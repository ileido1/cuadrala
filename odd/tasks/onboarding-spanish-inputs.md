# Onboarding Spanish inputs

## Objective, problem, and why
Default a new onboarding phone input to Venezuela (+58), and make birth-date selection clear, compact, and fully Spanish. Current empty PhoneController defaults to US, app lacks Spanish SDK localization, and the date dialog uses desktop orientation inside a mobile-width web frame.

## Authorized scope and constraints
Flutter mobile only: identity phone/date input, Spanish app localization, SDK dependency declaration, and regression tests. Preserve other countries, entered/existing controller phone values, DOB limits (1920 through the existing minimum-age bound), persistence contract, theme, and unrelated work. No API, DB, remote deploy, seed, new picker dependency, or shared web-frame changes.

## Plan
- [x] T1 — Default Venezuela and improve Spanish birth-date selection using existing Flutter Material picker; include regression tests and SDK localization. Route: delegated; preparation/mapping required 4+ files and writer touches 2+ non-trivial files. Commit with tests after observed checks.

## Acceptance criteria
- An empty phone field starts with Venezuela +58; entered foreign phone values and country switching remain functional.
- App SDK localization and date picker labels, months, weekdays, and actions are Spanish.
- Birth-date picker opens in year selection, stays compact portrait within the 390px web frame, and uses the existing dark/green theme.
- Selecting updates the visible date and existing ISO birthDate/birthYear state; cancel leaves state unchanged; existing allowed date bounds remain.

## Checks and configuration
TDD: ON; source: AGENTS.md Testing/Conventions and .cursor/rules/tdd-guidelines.mdc. Runner: /opt/flutter/flutter/bin/flutter test. Observe focused regression RED before source changes, GREEN afterwards, then refactor if needed.
Checks: flutter analyze; flutter test test/features/onboarding; targeted widget tests including narrow-layout dialog, Spanish copy, date selection/cancel, and phone defaults/preservation.
Runtime harness: focused Flutter widget tests at desktop MediaQuery/mobile-width constraints; no authenticated browser session or remote runtime required.
RDD: disabled/unmanaged; global OFF from gentle-ai review mode status. No receipt review.

## Delivery and rollback
Delivery strategy: ask-on-risk. Forecast: 180–250 authored additions + deletions, below advisory 400 threshold. No PR/push requested. Branch: codex/onboarding-spanish-inputs. Starting boundary: 8ac0633e8ee6b8957259af7b53b48992358b13fc.
Rollback: revert this task's commit affecting identity page, app locale setup, SDK dependency/lock changes, related tests, and this tracking document; unrelated tournament files remain untouched.

## Progress and evidence
Exploration: delegated explorer confirmed PhoneController default, missing app locale setup, and desktop MediaQuery orientation leak; existing native Material picker suffices.
Discovery: UserMeDto has no phone; no phone restoration API is added. Preserve entered controller values and country choice across rebuilds.
Checks: observed RED in /tmp/onboarding-red.log (US versus VE and day versus year assertions). GREEN: `/opt/flutter/flutter/bin/flutter analyze` no issues; `/opt/flutter/flutter/bin/flutter test --no-pub test/features/onboarding` 28 passed; git diff --check clean. Runtime widget harness covers desktop/mobile-frame dialog, Spanish months/weekdays, year-first bounds, select/cancel and ISO/E164 submission. Browser verification not run. Work-unit commit: d91034344161a973556a4b3cbc4ff080617f7677. Running authored commit line count: 226 (source/test plus feature tracking). RDD disabled/unmanaged.
Next step: user may test locally and decide deployment; no push or deployment performed.
