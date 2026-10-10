# cuadrala_mobile

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

## Web push configuration

Web push is optional. The deploy workflow reads these **public repository variables** and passes them to Flutter as build-time values:

- `FIREBASE_WEB_API_KEY`
- `FIREBASE_WEB_APP_ID`
- `FIREBASE_WEB_MESSAGING_SENDER_ID`
- `FIREBASE_WEB_PROJECT_ID`
- `FIREBASE_WEB_VAPID_KEY`
- Optional: `FIREBASE_WEB_AUTH_DOMAIN`, `FIREBASE_WEB_STORAGE_BUCKET`

The build writes the same public Firebase configuration into the deployed
`firebase-messaging-sw.js`. Do not add Firebase service-account credentials,
private keys, or server secrets to the mobile app or these variables. Until the
public values are configured and the deployed HTTPS origin is manually tested,
web push remains unavailable and live Firebase delivery is unverified.
