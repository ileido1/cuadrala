# Flutter Web Push Specification

## Purpose

Define the user-visible behavior for push notifications in Cuadrala's installable Flutter Web app, reusing the backend's existing Firebase Cloud Messaging registration-token contract.

## Requirements

### Requirement: User-controlled web push enrollment

The app MUST enable browser push only after an authenticated user explicitly chooses to enable notifications. It MUST explain the permission request in context and request browser notification permission only as a result of that user action. The app MUST NOT prompt automatically on launch or treat notification preferences alone as permission to subscribe a browser.

#### Scenario: User enables notifications and grants permission

- GIVEN an authenticated user has web push available and has not denied browser notification permission
- WHEN the user explicitly enables push notifications and grants browser permission
- THEN the app obtains a web FCM registration token and associates it with that user's existing push-token registration
- AND the app indicates that push notifications are enabled only after registration succeeds

#### Scenario: User declines browser permission

- GIVEN an authenticated user explicitly starts push enrollment
- WHEN the user denies browser notification permission
- THEN the app leaves web push disabled
- AND the app explains how the user can enable permission later through browser settings without repeatedly prompting

#### Scenario: User has not explicitly enabled push

- GIVEN an authenticated user has not chosen to enable push
- WHEN the app starts or the user changes match preferences
- THEN the app MUST NOT request browser notification permission or register a web push token

### Requirement: Existing backend token contract

The app MUST register browser FCM registration tokens using the backend's existing push-token contract and MUST NOT require a backend migration or send a different token identifier under that contract. Token synchronization MUST remain associated with the authenticated account and MUST handle a refreshed browser token so that future notifications target the current token.

#### Scenario: Browser token is refreshed

- GIVEN web push is enabled for an authenticated user
- WHEN Firebase provides a different registration token for the browser
- THEN the app synchronizes the new token with the existing backend registration endpoint
- AND the user remains subscribed without needing to repeat the permission prompt

#### Scenario: User signs out

- GIVEN the browser has a registered push token for the current account
- WHEN that user signs out
- THEN the app disables or removes that account's token registration using the existing backend contract
- AND the signed-out browser MUST NOT continue receiving notifications addressed to that account

#### Scenario: Registration request fails

- GIVEN browser permission is granted and a web token is available
- WHEN the backend rejects or cannot complete token registration
- THEN the app MUST NOT report push as enabled
- AND the app MUST preserve normal sign-in and app use while making the failed push state recoverable

### Requirement: Foreground and background notification delivery

When a matching backend notification is sent to a registered web token, the app MUST make it available while the PWA is active and MUST show a browser notification while the PWA is backgrounded or closed, subject to browser support and user permission. Notification content MUST identify the relevant event sufficiently for the user to decide whether to open Cuádrala, and activating a notification MUST open the relevant in-app destination when one is available.

#### Scenario: Matching notification arrives while app is active

- GIVEN an authenticated user has enabled web push and the PWA is open
- WHEN the backend sends a notification to the user's registered token
- THEN the app presents the notification within its active experience
- AND it does not lose the event merely because the app is in the foreground

#### Scenario: Matching notification arrives while app is in background

- GIVEN an authenticated user has enabled web push and granted browser permission
- WHEN the backend sends a notification while the PWA is backgrounded or closed
- THEN the browser displays a notification using the event's user-facing title and message
- AND activating it opens the relevant Cuádrala destination when that destination is available

#### Scenario: Browser cannot deliver push

- GIVEN the user's browser or current installation does not support web push
- WHEN the user views notification settings
- THEN the app explains that browser push is unavailable
- AND it continues to provide the app's existing in-app notification experience

### Requirement: PWA service worker compatibility

Push handling MUST coexist with the existing Flutter Web PWA installation and offline behavior. Enabling or receiving push MUST NOT replace, break, or narrow the existing app service-worker behavior or prevent the app from being installed.

#### Scenario: Push support is enabled in the PWA

- GIVEN the Flutter Web app is installable and its service-worker behavior is active
- WHEN web push support is initialized
- THEN both app installation/offline behavior and push handling remain available
- AND each notification is handled by the intended app origin and registration

### Requirement: Safe behavior without deployment configuration

The app MUST detect when the required Firebase Web configuration or public VAPID key is absent or invalid and MUST disable only web push enrollment and receipt in that environment. It MUST show a clear unavailable state, MUST NOT crash or block other app features, and MUST NOT create a token registration without valid configuration. Private Firebase service credentials MUST NOT be exposed to the browser. Push support MUST NOT be represented as live-verified until deployment configuration and delivery have been verified on the deployed HTTPS origin.

#### Scenario: Firebase Web configuration is missing

- GIVEN the deployed or local build lacks valid Firebase Web configuration or a public VAPID key
- WHEN a user opens notification settings or attempts to enable push
- THEN the app reports that web push is not configured and leaves enrollment disabled
- AND the app remains usable for all unrelated functions

#### Scenario: External deployment verification is incomplete

- GIVEN source changes are implemented but the deployed HTTPS origin has not been tested with a browser and account
- WHEN the feature's status is reported
- THEN implementation status is distinguished from verified live delivery
- AND no claim is made that real users can already receive browser push
