# Design: issue-47-tournament-invite-link

Leí `openspec/changes/issue-47-tournament-invite-link/spec.md` completo (REQ-TIL-001..012, NFR-TIL-001..004) y no reabro ningún requisito ahí cerrado. Antes de diseñar exploré el código real referenciado por el pedido (backend: puertos, casos de uso, repositorios Prisma, routers, validaciones, composición, schema Prisma; mobile: sheets de invitación, cubit/estado de registrations, router/redirect guards, manifest Android; web: api-client, middleware, layouts). Las decisiones de abajo están ancladas a ese código, no a suposiciones.

---

## Module layout

### Backend (`services/api`)

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `prisma/schema.prisma` | modify | nuevo modelo `TournamentInviteLink`; campo aditivo `TournamentRegistration.inviteLinkId` |
| `src/domain/ports/tournament_invite_link_repository.ts` | create | puerto + DTOs (`TournamentInviteLinkDTO`, `TournamentInviteLinkWithRegistrantsDTO`) |
| `src/domain/ports/tournament_registration_repository.ts` | modify | `CreateGuestTournamentRegistrationDTO.inviteLinkId?`, nuevo método `setInviteLinkIdSV` |
| `src/domain/tournament/tournament_invite_link_validity.ts` | create | `assertTournamentInviteLinkUsableSV(link)` — pura, sin DB (expirado/revocado/agotado) |
| `src/application/helpers/register_guest_for_tournament_core.ts` | create | lógica compartida de alta GUEST (roster-open, restricción competitivo+pago, cupos, `createGuestSV`) |
| `src/application/use_cases/invite_guest_tournament_participant.use_case.ts` | **modify** | delega su cuerpo de negocio al helper nuevo (elimina duplicación) |
| `src/application/use_cases/create_tournament_invite_link.use_case.ts` | create | REQ-TIL-001/003/004 |
| `src/application/use_cases/list_tournament_invite_links.use_case.ts` | create | REQ-TIL-006 |
| `src/application/use_cases/revoke_tournament_invite_link.use_case.ts` | create | REQ-TIL-005 |
| `src/application/use_cases/get_tournament_invite_link_preview.use_case.ts` | create | GET público |
| `src/application/use_cases/register_via_tournament_invite_link.use_case.ts` | create | POST público, delega en `RegisterTournamentParticipantUseCase` y en el helper de guest |
| `src/infrastructure/adapters/prisma_tournament_invite_link_repository.ts` | create | implementa el puerto; genera/hashea el token (igual que `PrismaTournamentGuestScheduleTokenRepository`) |
| `src/infrastructure/adapters/prisma_tournament_registration_repository.ts` | modify | `createGuestSV` pasa `inviteLinkId`; nuevo `setInviteLinkIdSV` |
| `src/presentation/validation/tournament_invite_link.validation.ts` | create | schemas zod (params/token/body de creación) |
| `src/presentation/controllers/tournament_invite_link.controller.ts` | create | 5 controllers |
| `src/presentation/routes/tournament_invite_link.router.ts` | create | 3 rutas autenticadas + 2 públicas (mismo router, mismo patrón que `tournament_schedule.router.ts`) |
| `src/presentation/routes/api.v1.router.ts` | modify | registra `TOURNAMENT_INVITE_LINK_ROUTER` |
| `src/presentation/composition/tournament_invite_link.composition.ts` | create | wiring; importa `REGISTER_TOURNAMENT_PARTICIPANT_UC` desde `tournament_registration.composition.ts` |
| `src/config/env.ts` | modify | nueva var `PUBLIC_WEB_URL` (dominio de `apps/web`, para construir `url`/`deepLink`) |

### Mobile (`apps/mobile`)

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `lib/src/features/tournament_invite_link/data/models/tournament_invite_link_dto.dart` | create | DTO link + DTO registrant |
| `lib/src/features/tournament_invite_link/data/tournament_invite_link_api.dart` | create | 5 llamadas HTTP (reusa `ApiClient`) |
| `lib/src/features/tournament_invite_link/data/tournament_invite_link_repository.dart` | create | mapeo DTO ↔ dominio, errores |
| `lib/src/features/tournament_invite_link/presentation/cubit/tournament_invite_links_state.dart` | create | estado (loading/loaded/generating/revoking) |
| `lib/src/features/tournament_invite_link/presentation/cubit/tournament_invite_links_cubit.dart` | create | generar/listar/revocar (gestión, organizador) |
| `lib/src/features/tournament_invite_link/presentation/widgets/generate_invite_link_sheet.dart` | create | sheet "Generar link" (paralelo a `invite_guest_sheet.dart`) |
| `lib/src/features/tournament_invite_link/presentation/tournament_invite_links_screen.dart` | create | listado de links + revocar + registrants |
| `lib/src/features/tournament_invite_link/presentation/cubit/tournament_invite_link_register_cubit.dart` | create | consumo público (preview + registro, lado jugador) |
| `lib/src/features/tournament_invite_link/presentation/tournament_invite_link_register_screen.dart` | create | pantalla a la que resuelve el deep link |
| `lib/src/core/deep_link/tournament_invite_link_deep_link_handler.dart` | create | `app_links`: cold-start + stream en caliente |
| `lib/src/router/routes.dart` | modify | `tournamentInviteLinks(tournamentId)`, `tournamentInviteLinkRegister(token)` → `/invite/:token` |
| `lib/src/router/app_router.dart` | modify | 2 `GoRoute` nuevas (fuera del shell) |
| `lib/src/app/app.dart` | modify | `setupTournamentInviteLinkDeepLinkHandler(router.router);` junto a `setupPushNotificationTapHandler` |
| `lib/src/features/tournaments/presentation/tournament_detail/org_registrations_tab.dart` | modify | botón "Generar link" → `TournamentInviteLinksScreen` |
| `pubspec.yaml` | modify | agrega `app_links` |
| `android/app/src/main/AndroidManifest.xml` | modify | `intent-filter` con `autoVerify="true"` para el dominio del link |
| iOS: `Runner.entitlements` (o equivalente Associated Domains) | modify | `applinks:<dominio>` |

### Web (`apps/web`)

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/app/invite/[token]/page.tsx` | create | landing pública: preview + formulario condicional |
| `src/app/invite/[token]/invite-form.tsx` | create | client component: estado del formulario, llamada de registro |
| `src/lib/api-client.ts` | modify | 2 métodos nuevos (`getTournamentInviteLinkPreview`, `registerViaTournamentInviteLink`) reusando el mismo `ApiClient` (y por lo tanto su interceptor de `Authorization`) |

---

## Interfaces

### Backend — dominio

```ts
// domain/ports/tournament_invite_link_repository.ts
export type TournamentInviteLinkDTO = {
  id: string;
  tournamentId: string;
  createdByUserId: string;
  expiresAt: Date;
  maxUses: number | null;
  usesCount: number;
  revokedAt: Date | null;
  createdAt: Date;
};

export type TournamentInviteLinkRegistrantDTO = {
  registrationId: string;
  type: 'AUTHENTICATED' | 'GUEST';
  displayName: string;
  registeredAt: Date;
};

export type TournamentInviteLinkWithRegistrantsDTO = TournamentInviteLinkDTO & {
  registrants: TournamentInviteLinkRegistrantDTO[];
};

export interface TournamentInviteLinkRepository {
  /** Genera el token crudo (randomBytes(32) base64url), lo hashea y persiste; devuelve ambos. */
  createSV(_input: {
    tournamentId: string;
    createdByUserId: string;
    expiresAt: Date;
    maxUses: number | null;
  }): Promise<{ link: TournamentInviteLinkDTO; token: string }>;

  /** Hashea `_rawToken` internamente y busca por `tokenHash` (nunca compara crudo). */
  findByTokenHashSV(_rawToken: string): Promise<TournamentInviteLinkDTO | null>;

  findByIdAndTournamentIdSV(_id: string, _tournamentId: string): Promise<TournamentInviteLinkDTO | null>;

  listByTournamentIdWithRegistrantsSV(_tournamentId: string): Promise<TournamentInviteLinkWithRegistrantsDTO[]>;

  incrementUsesCountSV(_id: string): Promise<void>;

  /** Idempotente: revocar un link ya revocado no es error. */
  revokeSV(_id: string): Promise<void>;
}
```

```ts
// domain/tournament/tournament_invite_link_validity.ts
/** Pura, sin DB. Lanza 410 ENLACE_INVALIDO / 409 ENLACE_REVOCADO / 409 ENLACE_AGOTADO. */
export function assertTournamentInviteLinkUsableSV(_link: TournamentInviteLinkDTO): void;
```

```ts
// application/helpers/register_guest_for_tournament_core.ts
export type RegisterGuestForTournamentCoreInput = {
  tournament: {
    id: string;
    status: string;
    isCompetitive: boolean;
    inscriptionPrice: number | null;
    maxSlots: number | null;
  };
  guestName: string;
  guestPhone?: string | null;
  guestEmail: string;
  registeredByUserId: string;
  inviteLinkId?: string | null;
};

/** Roster-open (REQ-TIL-009) + restricción competitivo/pago + cupos (REQ-TIL-010) + createGuestSV. */
export async function registerGuestForTournamentCoreSV(
  _input: RegisterGuestForTournamentCoreInput,
  _registrationRepository: TournamentRegistrationRepository,
): Promise<TournamentRegistrationDTO>;
```

### Backend — Use Cases

```ts
class CreateTournamentInviteLinkUseCase {
  constructor(
    _tournamentRepository, _inviteLinkRepository,
    _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
    _publicWebUrl: string,
  );
  executeSV(_input: {
    tournamentId: string; actorUserId: string;
    expiresAt?: Date; maxUses?: number | null;
  }): Promise<{
    id: string; token: string; url: string; deepLink: string;
    expiresAt: Date; maxUses: number | null; usesCount: 0;
    revokedAt: null; createdAt: Date;
  }>;
}

class ListTournamentInviteLinksUseCase {
  constructor(_tournamentRepository, _inviteLinkRepository, _assertTournamentOrganizerAccess);
  executeSV(_input: { tournamentId: string; actorUserId: string }): Promise<TournamentInviteLinkWithRegistrantsDTO[]>;
}

class RevokeTournamentInviteLinkUseCase {
  constructor(_tournamentRepository, _inviteLinkRepository, _assertTournamentOrganizerAccess);
  executeSV(_input: { tournamentId: string; linkId: string; actorUserId: string }): Promise<void>;
}

class GetTournamentInviteLinkPreviewUseCase {
  constructor(_inviteLinkRepository, _tournamentRepository, _sportRepository, _categoryRepository, _venueRepository);
  executeSV(_token: string): Promise<{
    tournamentId: string; tournamentName: string; sportName: string;
    categoryName: string; venueName: string | null; startsAt: Date | null;
    status: string; acceptsRegistration: boolean;
  }>;
}

class RegisterViaTournamentInviteLinkUseCase {
  constructor(
    _inviteLinkRepository, _tournamentRepository, _registrationRepository,
    _registerTournamentParticipant: RegisterTournamentParticipantUseCase, // reuso directo, sin tocarlo
  );
  executeSV(_input: {
    token: string;
    actorUserId: string | null; // viene de optionalAuth
    guestInput?: { name: string; phone?: string | null; email: string } | null;
  }): Promise<{ registrationId: string; registrationType: 'AUTHENTICATED' | 'GUEST'; tournamentId: string; status: string }>;
}
```

### Backend — Validaciones (zod, solo forma — ver "Decisiones" para por qué los rangos de negocio NO van aquí)

```ts
// presentation/validation/tournament_invite_link.validation.ts
export const TOURNAMENT_INVITE_LINK_TOURNAMENT_PARAMS_SCHEMA = z.object({ tournamentId: z.string().uuid() }).strict();
export const TOURNAMENT_INVITE_LINK_ID_PARAMS_SCHEMA = z.object({ tournamentId: z.string().uuid(), linkId: z.string().uuid() }).strict();
export const TOURNAMENT_INVITE_LINK_TOKEN_PARAMS_SCHEMA = z.object({ token: z.string().min(40).max(200) }).strict(); // mismo patrón que GUEST_SCHEDULE_TOKEN_PARAM_SCHEMA
export const CREATE_TOURNAMENT_INVITE_LINK_BODY_SCHEMA = z.object({
  expiresAt: z.coerce.date().optional(),
  maxUses: z.number().int().nullable().optional(),
}).strict();
// El body de invitado del registro vía link NO tiene schema propio:
// se reusa INVITE_GUEST_TOURNAMENT_PARTICIPANT_BODY_SCHEMA tal cual (NFR-TIL-003).
```

### Mobile

```dart
abstract interface class TournamentInviteLinkApi {
  Future<Map<String, Object?>> createEnvelope({required String tournamentId, DateTime? expiresAt, int? maxUses});
  Future<Map<String, Object?>> listEnvelope({required String tournamentId});
  Future<void> revoke({required String tournamentId, required String linkId});
  Future<Map<String, Object?>> previewEnvelope({required String token});
  Future<Map<String, Object?>> registerEnvelope({required String token, String? name, String? phone, String? email});
}
```

```dart
void setupTournamentInviteLinkDeepLinkHandler(GoRouter router); // mismo patrón que setupPushNotificationTapHandler
```

### Web

```ts
// lib/api-client.ts (métodos nuevos en la misma clase ApiClient)
getTournamentInviteLinkPreview(token: string): Promise<TournamentInviteLinkPreview>;
registerViaTournamentInviteLink(token: string, body: { name?: string; phone?: string; email?: string }): Promise<TournamentRegistrationResult>;
```

---

## Data flow — "registro por link" end-to-end

```
(1) Organizador — generar link (UI mobile):
GenerateInviteLinkSheet → TournamentInviteLinksCubit.generate()
  → TournamentInviteLinkRepository.create() → TournamentInviteLinkApi.createEnvelope()
  → POST /tournaments/:id/invite-links (Authorization: Bearer)
  → requireAuth → postCreateTournamentInviteLinkCON
  → CREATE_TOURNAMENT_INVITE_LINK_UC.executeSV
      → TournamentRepository.findByIdSV (404 si no existe)
      → AssertTournamentOrganizerAccessUseCase.executeSV (403 si no autoriza)
      → valida rango de expiresAt/maxUses en el propio UC (422 si corresponde)
      → resuelve expiresAt default (MIN(registrationClosesAt,startsAt) | +30d) si no vino override
      → TournamentInviteLinkRepository.createSV → randomBytes(32) + sha256 + persist
      → construye url = deepLink = `${PUBLIC_WEB_URL}/invite/${token}`
  ← 201 { id, token, url, deepLink, expiresAt, maxUses, usesCount:0, revokedAt:null, createdAt }
  (el token crudo solo existe en esta respuesta; la UI lo muestra una vez con "Compartir")

(2) Alguien abre la URL compartida (WhatsApp/mail/SMS):
  2a. Android/iOS con la app instalada y App/Universal Links verificados
      → el OS abre Cuádrala directamente (sin pasar por el navegador)
      → AppLinks().uriLinkStream / getInitialAppLink() entrega el Uri
      → setupTournamentInviteLinkDeepLinkHandler extrae :token del path
      → router.go('/invite/$token') → TournamentInviteLinkRegisterScreen
      → TournamentInviteLinkRegisterCubit.loadPreview(token)
          → GET /public/tournament-invite-links/:token (optionalAuth; sin guard de ruta: /invite no está en isProtected)
          → getTournamentInviteLinkPreviewCON → GET_TOURNAMENT_INVITE_LINK_PREVIEW_UC
              → TournamentInviteLinkRepository.findByTokenHashSV
              → assertTournamentInviteLinkUsableSV (410/409 si inválido/revocado/agotado)
              → TournamentRepository.findByIdSV (404 si no existe)
              → Promise.all([SportRepository.findByIdSV, CategoryRepository.findByIdSV, venueId ? VenueRepository.findByIdSV : null])
              → acceptsRegistration = isTournamentRosterOpenSV(status)  // informativo, NO lanza
          ← 200 { tournamentId, tournamentName, sportName, categoryName, venueName, startsAt, status, acceptsRegistration }
      → la pantalla muestra preview; si hay SessionAuthenticated, ofrece "Confirmar inscripción" (sin formulario);
        si no, pide { name, phone?, email }
      → submit → POST /public/tournament-invite-links/:token/register
          (dio adjunta Authorization automáticamente si hay sesión — mismo auth_token_interceptor.dart de siempre)
          → optionalAuth → postRegisterViaTournamentInviteLinkCON
          → si _req.authUser presente: actorUserId = authUser.id, guestInput = null
            si no: body se valida con INVITE_GUEST_TOURNAMENT_PARTICIPANT_BODY_SCHEMA (400 si inválido, sin tocar DB)
          → REGISTER_VIA_TOURNAMENT_INVITE_LINK_UC.executeSV
              → findByTokenHashSV + assertTournamentInviteLinkUsableSV (410/409)
              → rama AUTHENTICATED:
                  → RegisterTournamentParticipantUseCase.executeSV({tournamentId: link.tournamentId, userId: actorUserId})
                      (reusa roster-open REQ-TIL-009, cupos REQ-TIL-010, upsert idempotente, notifica organizador — SIN TOCAR este UC)
                  → si created === true:
                      → TournamentInviteLinkRepository.incrementUsesCountSV(link.id)
                      → TournamentRegistrationRepository.setInviteLinkIdSV(registration.id, link.id)  // write de atribución, solo en alta nueva
              → rama GUEST (sin Authorization):
                  → TournamentRepository.findByIdSV(link.tournamentId) (404 si no existe)
                  → registerGuestForTournamentCoreSV({ tournament, ...guestInput, registeredByUserId: link.createdByUserId, inviteLinkId: link.id }, registrationRepository)
                      (roster-open + restricción competitivo/pago + cupos + createGuestSV — MISMA función que usa InviteGuestTournamentParticipantUseCase)
                  → TournamentInviteLinkRepository.incrementUsesCountSV(link.id)  // siempre, no hay idempotencia para GUEST
          ← 201 { registrationId, registrationType, tournamentId, status: 'PENDING' }
      → cubit muestra confirmación

  2b. App no instalada / escritorio
      → el navegador abre apps/web/src/app/invite/[token]/page.tsx (server component)
      → fetch inicial de preview vía el mismo contrato público (GET .../invite-links/:token)
      → si preview.acceptsRegistration === false o el link viene 410/409: landing muestra el motivo específico
        (expirado / revocado / agotado / torneo cerrado), no un error genérico (REQ-TIL-012)
      → <InviteForm> (client component) usa apiClient.registerViaTournamentInviteLink
          (mismo ApiClient con interceptor de localStorage.accessToken: si el navegador ya tiene sesión
           de staff/jugador de un login previo en este mismo dominio, el header Authorization se adjunta solo)
      → POST /public/tournament-invite-links/:token/register — mismo backend que 2a
      → confirmación en la misma página (REQ-TIL-012: registro completo, no solo "descargá la app")
```

---

## Dependencies & transactions

- No hay transacción multi-tabla nueva: cada escritura (`createSV` del link, `createGuestSV`, `upsertSV`, `incrementUsesCountSV`, `setInviteLinkIdSV`) es una sola operación Prisma, igual al patrón *best-effort* ya aceptado por el spec para `guest_schedule_action.use_case.ts` ("una sola lectura antes de escribir, sin transacción serializable adicional" — Edge cases, "Revocación concurrente con un registro en curso").
- `RegisterViaTournamentInviteLinkUseCase` NO envuelve la llamada a `RegisterTournamentParticipantUseCase` + `incrementUsesCountSV` + `setInviteLinkIdSV` en una transacción Postgres explícita: son 2-3 escrituras secuenciales, con el mismo nivel de garantía (no atómico) que ya tiene `maxSlots` hoy — el spec lo documenta como limitación heredada, no una regresión nueva.
- Usa: `AssertTournamentOrganizerAccessUseCase` (sin UC nuevo de autorización, como ya decidió el spec), `isTournamentRosterOpenSV`, `RegisterTournamentParticipantUseCase` (sin modificar), `SportRepository`/`CategoryRepository`/`VenueRepository` (ya existen, resueltos con `Promise.all` por ser independientes).
- Nueva dependencia mobile: paquete `app_links` (recomendado explícitamente por el spec). Sin dependencias nuevas en backend/web.

---

## Decisiones de diseño (con razón)

1. **`RegisterViaTournamentInviteLinkUseCase` delega en `RegisterTournamentParticipantUseCase` sin tocarlo, pero NO delega directamente en `InviteGuestTournamentParticipantUseCase`.** Ese último hace su propio `AssertTournamentOrganizerAccessUseCase.executeSV` contra `actorUserId` — si lo llamara pasando `createdByUserId` del link como actor, re-evaluaría la autoridad del *creador del link* en el momento del registro (no en el momento en que generó el link), lo cual puede fallar (403) si ese staff perdió su rol después, cosa que el spec no pide. Por eso extraje el cuerpo de negocio (roster-open + restricción competitivo/pago + cupos + `createGuestSV`) a `registerGuestForTournamentCoreSV`, y `InviteGuestTournamentParticipantUseCase` ahora llama a ese mismo helper después de su propio chequeo de autoridad. Resultado: cero lógica duplicada, cero re-chequeo de autoridad indebido.

2. **Token: generación y hash viven en el repositorio Prisma, no en un helper de `application/helpers/`.** Precedente real (`PrismaTournamentGuestScheduleTokenRepository.issueSV`/`findByHashSV`): `randomBytes`+`createHash` inline en infraestructura, el caso de uso nunca toca cripto directamente. Misma asimetría para `TournamentInviteLink`.

3. **Atribución `inviteLinkId` en la inscripción: camino distinto para AUTHENTICATED vs GUEST.** Para GUEST, `createGuestSV` es un INSERT nuevo cada vez: paso `inviteLinkId` directo en el DTO. Para AUTHENTICATED, `upsertSV` es un camino muy usado (autoinscripción normal): write de atribución aparte (`setInviteLinkIdSV`), solo si `created === true`.

4. **Validación de rango de negocio (`expiresAt` 1h–180d, `maxUses >= 1`) vive en el Use Case, no en zod.** No hay evidencia confirmada de que el manejador global de errores mapee `ZodError` a 422 (lo mapea a 400 en los casos vistos). Zod solo para forma; rango de negocio como `AppError(...,422)` explícito en el Use Case, mismo patrón que `assertRegistrationIdentityInvariantSV`.

5. **Router único mezclando rutas autenticadas y públicas, igual que `tournament_schedule.router.ts`** (ese archivo ya mezcla `/public/...` con rutas `requireAuth` en el mismo `Router()` — no hay "router público" separado en este proyecto).

6. **Composition file propio, no extender `tournament_registration.composition.ts`** — el proyecto ya aísla composición por capability incluso con solapamiento de dependencias (ver `tournament_schedule.composition.ts` vs `tournament_registration.composition.ts`).

7. **`url` y `deepLink` en la respuesta de creación son literalmente el mismo string** — el spec pide "una única URL universal", sin esquema custom (`cuadrala://...`).

8. **Nueva env var `PUBLIC_WEB_URL`** (no reuso `PUBLIC_API_URL`, que ya se usa para links que apuntan directo a la API, dominio distinto al de `apps/web`).

9. **Mobile: módulo nuevo `features/tournament_invite_link/`** en vez de extender `TournamentsRepository`/`TournamentRegistrationsCubit` — por aislamiento de capability y porque `TournamentRegistrationsState` ya tiene 16 campos.

10. **Deep link: `setupTournamentInviteLinkDeepLinkHandler(router.router)` en `app.dart`**, junto a `setupPushNotificationTapHandler` — mismo precedente exacto para "evento externo → navegación con GoRouter".

11. **Verificado, no asumido: `/invite/:token` no choca con los guards existentes** (`apps/web/src/middleware.ts` ni `apps/mobile/lib/src/router/auth_redirect.dart` lo protegen). Cero cambios necesarios en esos guards.

---

## Puntos resueltos con el usuario (2026-10-28)

1. **Restricción "torneo competitivo + inscripción con costo no admite invitados" (403 `TORNEO_RESTRINGIDO`) SÍ aplica también al registro GUEST vía link** — confirmado por el usuario. El helper compartido (`registerGuestForTournamentCoreSV`) ya la implementa así; agregar el escenario de test correspondiente en la fase de Tester.

2. **`DELETE .../invite-links/:linkId` cuando `:tournamentId` no existe → `404 ENLACE_NO_ENCONTRADO`** (no un `TORNEO_NO_ENCONTRADO` nuevo), fail-closed, consistente con "no se filtra existencia cruzada" del resto del spec. Resuelto por el orquestador con la misma lógica que ya traía el Designer, sin necesidad de reabrir con el usuario.

3. **`createdByUserId` no nulo (contrato literal del spec) implica `onDelete: Restrict`**, distinto del resto de FKs de "actor" en el schema (`registeredByUserId`/`organizerUserId` son `String?` con `SetNull`). Se respeta el contrato literal en vez de aflojarlo — si se borra un usuario que generó links, Postgres bloqueará el borrado en vez de perder el historial de `registrants` en silencio.

## Key Learnings

1. `RegisterTournamentParticipantUseCase` y `InviteGuestTournamentParticipantUseCase` no comparten código de negocio hoy: cada uno repite su propia versión de roster-open/cupos, lo que obligó a extraer un helper nuevo en vez de delegar directo para no heredar el chequeo de autoridad incorrecto del segundo caso de uso.
2. `PrismaTournamentGuestScheduleTokenRepository` genera y hashea el token crudo dentro de infraestructura (no en una capa de aplicación), estableciendo el precedente real que `TournamentInviteLink` debe seguir.
3. `apps/web` es exclusivamente un backoffice de staff hoy; no existe flujo de login de jugador en ese app, así que la landing `/invite/[token]` es la primera página verdaderamente pública de ese código base.
4. Ni `apps/web/src/middleware.ts` ni `apps/mobile/lib/src/router/auth_redirect.dart` protegen la ruta `/invite`, por lo que el deep link y la landing web funcionan sin sesión sin requerir cambios en esos guards.
5. El manejador de error global de este backend no tiene evidencia confirmada de mapear `ZodError` a 422, por lo que los rangos de negocio exigidos como 422 por el spec deben validarse explícitamente en el caso de uso.
