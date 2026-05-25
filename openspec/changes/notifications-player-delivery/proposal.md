# Proposal: notifications-player-delivery

## Problema

Los jugadores no reciben avisos cuando hay mensajes de chat, alguien se une a su partida, o se confirma un pago.

## Causa raíz

1. Use cases de negocio no crean `NotificationEvent` + deliveries directos.
2. Dispatch geo procesaba eventos que ya tienen audiencia explícita.
3. Worker/FCM desactivados por defecto en dev.
4. Mobile: contrato in-app (`deliveryId` + `event`) no mapeado a `title`/`body`.

## Alcance (MVP)

- Cablear `PostMatchChatMessage`, `JoinMatch`, `RecordPlayerPaymentSelection`, `ConfirmTransactionAsVenueStaff`.
- Nuevos tipos: `MATCH_PLAYER_JOINED`, `PAYMENT_CONFIRMED`.
- Dispatch: omitir fase geo para eventos con deliveries directos.
- API in-app: devolver `type`, `title`, `body`, `deepLink`.
- Mobile: `fromJson` compatible con respuesta enriquecida.

## Ola 2 (push FCM mobile)

- `firebase_core` + `firebase_messaging` en `apps/mobile`.
- `PushTokenSyncService`: registro tras login/bootstrap, limpieza en logout.
- Tap en notificación → chat o detalle de partida.
- Guía: `apps/mobile/docs/PUSH_NOTIFICATIONS.md`.

## Fuera de alcance

- Certificados APNs en producción (documentado en guía FCM).

## Criterios de aceptación

- POST mensaje chat → delivery PENDING para otros participantes.
- POST join → delivery para participantes existentes (≠ quien se une).
- Confirmar pago staff → delivery al jugador pagador.
- Registrar medio de pago → delivery al organizador (si ≠ pagador).
