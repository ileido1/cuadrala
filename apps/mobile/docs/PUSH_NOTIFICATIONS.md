# Push notifications (FCM) — mobile jugador

## Resumen

Tras login o bootstrap con sesión válida, la app registra el token FCM en
`POST /api/v1/users/me/device-push-tokens`. Al cerrar sesión, deshabilita los
tokens del usuario.

## Configuración Firebase (obligatoria para push real)

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Añade apps **Android** (`com.cuadrala.cuadrala_mobile`) e **iOS** si aplica.
3. Descarga y coloca:
   - `android/app/google-services.json`
   - `ios/Runner/GoogleService-Info.plist`
4. (Recomendado) `dart pub global activate flutterfire_cli` y en `apps/mobile`:
   `flutterfire configure`

Sin `google-services.json`, el build Android sigue funcionando (el plugin
Google Services solo se aplica si el archivo existe). FCM quedará desactivado
hasta configurar Firebase.

## API (backend)

En `services/api/.env`:

```env
NOTIFICATIONS_WORKER_ENABLED=true
NOTIFICATIONS_DISPATCH_SECRET=...
# Base64 del JSON de cuenta de servicio Firebase:
FCM_SERVICE_ACCOUNT_JSON_BASE64=...
```

Sin `FCM_SERVICE_ACCOUNT_JSON_BASE64`, el worker corre pero el envío push es
**noop** (las notificaciones in-app en BD sí se crean).

Generar base64:

```bash
base64 -w0 path/to/firebase-service-account.json
```

## Probar en dispositivo

1. Reinicia API con worker y FCM configurados.
2. Login en dos cuentas en la misma partida.
3. Envía mensaje / join / pago → el otro usuario debe recibir push (si tiene
   permisos de notificación concedidos).
4. Tocar la notificación abre chat o detalle de partida según `eventType`.

## Plataformas

| Plataforma | Push en bandeja del sistema |
|------------|----------------------------|
| Android    | Sí (FCM + permiso notificaciones) |
| iOS        | Sí (FCM + permiso) |
| Web/Chrome | **No** — solo bandeja in-app (Avisos) |
| Linux desktop | **No** |

**Importante:** si ejecutas `flutter run` y eliges **Chrome** o **Linux**,
no se registrará token FCM y la API verá `attemptedTokens: 0` en los logs.

```bash
flutter devices          # lista dispositivos
flutter run -d <android> # teléfono o emulador con Google Play
```
