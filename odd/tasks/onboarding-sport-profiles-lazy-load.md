# Onboarding: no precargar "deportes" hasta que sea el paso activo (issue #137)

Branch: `fix/onboarding-sport-profiles-lazy-load`. Runner: `flutter test` en `apps/mobile/`.

## Specs

- **S1 (issue #137)**: usuario reportó que registrar una cuenta, tocar "Continuar" y caer en onboarding a veces cierra la sesión sola — persiste después de PR #119 (que solo arregló el parpadeo visual de pantallas, no un logout real).
- **S2**: mecanismo confirmado por investigación previa (sin reproducción en dispositivo, por lectura de código): el único logout automático de la app es un interruptor global en `AuthTokenInterceptor` — un solo `refresh()` fallido cierra la sesión entera, sin importar qué otras requests estén en vuelo. Al llegar a onboarding se disparaban más llamadas autenticadas concurrentes que en cualquier otro punto de la app: `OnboardingCubit.load()`, `OnboardingIdentityPage.getMe()` (ambas legítimas, la página 0 está realmente activa) y, además, `OnboardingSportProfilesPage.initState()` — aunque esa es la página 1, **todavía no visible** — por el precaching por defecto del `PageView`/`SliverFillViewport` de Flutter (cache extent ~250px, que alcanza el arranque de la página siguiente aunque el usuario siga en la página 0).
- **S3**: fix — aplicar a `OnboardingSportProfilesPage` el mismo patrón `isActive` que ya existe en este mismo codebase para `OnboardingLocationPage` (prop `isActive`, gateado en `initState`/`didUpdateWidget`), para que `listSports()`/`listSportProfiles()`/`getPlayerProfile()` no se disparen hasta que el usuario realmente llegue al paso 1.

## Lo que este fix NO garantiza

Reduce la concurrencia de 3-4 llamadas autenticadas a ~2 (`OnboardingCubit.load()` + `OnboardingIdentityPage.getMe()`, ambas legítimamente necesarias para la página 0), pero no elimina la concurrencia del todo, y la causa exacta de por qué el primer `refresh()` llega a fallar en este escenario sigue sin confirmarse — eso requiere logs de un dispositivo real. Si el usuario vuelve a ver el bug después de este fix, el próximo paso es esa evidencia en vivo, no otra teoría de código.

## Tasks

| ID | Linked S# | Route | Status | Commit/Evidence |
|----|-----------|-------|--------|------------------|
| T1 | S1-S3 | inline (parent) | done | ver Log |

## Log

- **L1**: Usuario dijo "haz el 137" sin logs. Dado que el mecanismo (interruptor global de logout + concurrencia excesiva al montar onboarding) ya estaba confirmado por lectura de código en la investigación previa, implementé la mitigación de menor riesgo y mayor evidencia disponible sin tocar código de auth/sesión: reducir la concurrencia en el origen (precaching del PageView), reusando un patrón YA existente en el mismo archivo para un problema idéntico (`OnboardingLocationPage`).
- Confirmé el patrón existente (`isActive` + `didUpdateWidget` + gate en `_requestLocationWhenActive`) en `location_page.dart:39-57`, y que `onboarding_flow_screen.dart` ya le pasa `isActive: _currentPage == 2` a esa página pero nunca se replicó el mismo patrón para `OnboardingSportProfilesPage` (página índice 1, exactamente la que la investigación señaló como sospechosa de precaching).
- RED: test nuevo (`sport_profiles_page_test.dart`, no existía antes) confirma que `CatalogRepository.listSports()` no se llama con `isActive: false` y sí se llama al activarse — falla contra el código viejo (parámetro inexistente) → GREEN tras el fix.
- Regresión: `test/features/onboarding/` completo (34/34, incluye `sport_profiles_prefill_test.dart` que ya ejercía esta página en otro contexto, sin cambios de comportamiento ahí gracias al default `isActive = true`). Suite completo: 1294/1294, `flutter analyze` limpio.
- Transparencia con el usuario: este fix no toca `AuthTokenInterceptor` ni `SessionCubit` — es deliberadamente el cambio de menor riesgo posible dado lo que SÍ está confirmado. Si el bug persiste, el issue #137 sigue abierto y el próximo paso son logs reales.
