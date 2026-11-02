# Auth: refresh() single-flight (logout forzado tras login)

Branch: `fix/auth-refresh-single-flight`. Runner: `flutter test` en `apps/mobile/`.

## Specs

- **S1**: usuario reporta "llego al home y luego me saca al login". Investigado con reproducción real (no solo lectura de código): `HomeCubit.load()` dispara 3 llamadas autenticadas en paralelo al montar (pre-existente, no de esta sesión). `AuthTokenInterceptor.onError` no dedupa `refreshSession()` entre 401 concurrentes. El backend rota el refresh token en cada uso (single-use) — si dos 401 concurrentes llaman `refresh()` cada uno por su cuenta, el que pierde la carrera usa un token ya invalidado por el otro, falla, y dispara `SessionCubit.logout()` aunque la sesión seguía siendo válida.
- **S2**: `AuthRepository.refresh()` debe ser single-flight — toda llamada mientras haya un refresh en curso espera el MISMO `Future` en vez de iniciar uno nuevo, para que el backend nunca vea más de un request real por episodio de refresh.

## Tasks

| ID | Linked S# | Route | Status | Commit/Evidence |
|----|-----------|-------|--------|------------------|
| T1 | S1 | delegated (investigador, read-only) | done | causa raíz confirmada con reproducción real, hipótesis inicial del padre refutada correctamente |
| T2 | S2 | inline (parent) | done | ver Log |

## Log

- **L1**: Usuario reportó el bug en vivo tras el batch de 10 issues de UI/UX de hoy ("con los cambios que hicimos..."). Mi hipótesis inicial (doble `bootstrap()` por rebuild de `App`) fue investigada y **refutada** con evidencia (`App.build()` corre una sola vez, `main.dart` llama `runApp` una vez). El investigador encontró la causa real: condición de carrera en `AuthTokenInterceptor` + rotación single-use del backend — confirmado que es **pre-existente**, no causado por los cambios de hoy (verificado contra el diff real del PR #117: `home_cubit.dart` ya tenía las 3 llamadas paralelas antes de hoy).
- Usuario confirmó implementar el fix tras ver el diagnóstico con reproducción.
- Fix: `AuthRepository.refresh()` ahora es single-flight (`_inFlightRefresh` compartido). Reutilizado automáticamente por `refreshOrFailure()`, `SessionCubit.bootstrap()` y `AuthTokenInterceptor` (todos pasan por el mismo `AuthRepository`).
- RED confirmado (test nuevo en `auth_repository_test.dart`: `authApi.refresh` llamado 2 veces en vez de 1) → GREEN tras el fix. Regresión: `test/features/auth/` + `test/core/` (128 tests) sin cambios de comportamiento. Suite completo: 1285/1285, analyze limpio.
