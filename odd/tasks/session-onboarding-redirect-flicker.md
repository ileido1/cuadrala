# Session: flicker /login → /home → /onboarding (no es bug de Google)

Branch: `fix/session-onboarding-redirect-flicker`. Runner: `flutter test` en `apps/mobile/`.

## Specs

- **S1**: usuario reportó "cuando inicio sesión con google no inicia sesión vuelve a la pantalla inicial y cuando se registra alguien con google y va al onboarding se muestra la pantalla y luego se cierra sesión", y luego confirmó: "y cuando se inicia sesión en una cuenta que va al onboarding con usuario y clave también sucede lo mismo" — descartando que sea específico de Google.
- **S2**: investigado con evidencia real (test temporal, no commiteado): `SessionCubit.markAuthenticated()` y `bootstrap()` emitían `authenticated()` (onboardingComplete: null) como paso intermedio, antes de resolver el estado real de onboarding. `AppRouter` usa `refreshListenable: GoRouterRefreshStream(sessionCubit.stream)`, que reacciona a CADA emit. `auth_redirect.dart` manda `onboardingComplete == null` en una ruta de auth a `/home` (comportamiento intencional, no se tocó). Combinado: todo login/registro con onboarding pendiente rebotaba `/login → /home → /onboarding`.
- **S3**: fix — `markAuthenticated()` y `bootstrap()` deben resolver el estado real de onboarding ANTES de emitir, en un único emit final, para que el router nunca vea el estado intermedio.
- **S4 (no confirmado, fuera de alcance de este fix)**: el "se cierra sesión" como logout real (no solo el rebote de pantallas) y el síntoma de Google-login-existente-no-entra quedan sin explicar — ver Log.

## Tasks

| ID | Linked S# | Route | Status | Commit/Evidence |
|----|-----------|-------|--------|------------------|
| T1 | S1-S2 | delegated (investigador, read-only) | done | causa raíz confirmada, compartida entre Google y usuario/clave |
| T2 | S3 | inline (parent) | done | ver Log |

## Log

- **L1**: Usuario reportó dos bugs de Google sign-in; mientras el investigador corría, el usuario amplió el alcance confirmando que el síntoma de "onboarding se muestra y luego se cierra sesión" también pasa con usuario/clave — descartando teorías Google-específicas para ese síntoma.
- El investigador confirmó la causa del rebote de pantallas con un test real (borrado, no commiteado) y señaló explícitamente que el logout real (vs. el simple rebote de pantallas) y el síntoma de Google-login-existente no quedaron confirmados.
- Usuario autorizó implementar el fix confirmado ahora (vía AskUserQuestion), dejando constancia de que lo no confirmado queda pendiente.
- RED: 2 tests en `session_cubit_test.dart` (bootstrap actualizado deliberadamente, markAuthenticated nuevo) fallan contra el código viejo (emit intermedio con `onboardingComplete: null`). GREEN tras colapsar ambos métodos a un único emit final (`_resolveOnboardingCompleteSV()` resuelve antes de emitir). `auth_redirect.dart` y su test NO se tocaron — su regla sigue siendo válida, solo se eliminó el estado intermedio que la disparaba sin necesidad.
- Regresión: `session_cubit_test.dart`, `auth_token_interceptor_test.dart`, `auth_redirect_test.dart`, `auth_repository_test.dart` (17/17). Suite completo: 1286/1286, `flutter analyze` limpio.
- Pendiente para una sesión futura: instrumentar y reproducir en vivo el logout real (S4) y el síntoma de Google-login-existente (idToken nulo en cuenta cacheada, teoría sin confirmar).
