# Issue #88 — GROUPS_PLUS_KNOCKOUT: la Final nunca recibe los ganadores de semifinal

Branch: `fix/issue-88-groups-plus-knockout-final-advancement`. API runner: `npm test` (vitest) in `services/api/`.

## Specs

- **S1**: Una vez jugadas ambas semifinales de un torneo `GROUPS_PLUS_KNOCKOUT`, el partido de Final debe materializarse automáticamente con los dos ganadores de semifinal como `playerA`/`playerB` — misma transacción y mismo patrón que el avance automático de `SINGLE_ELIMINATION` (S7c-1/D13), pero sin reusar su resolver multi-ronda genérico: la Final de GPK es un único slot fijo (ganador de semifinal 1 → A, ganador de semifinal 2 → B), así que se resuelve directo.
- **S2**: Si falta jugar alguna semifinal, la Final sigue sin materializarse (TBD) — ningún jugador inventado.
- **S3**: Idempotente: reintentar cargar un resultado ya cargado devuelve 409 y no duplica la Final.
- **S4**: El avance de `SINGLE_ELIMINATION` (S7c-1) queda exactamente igual — regresión cubierta reutilizando el suite existente completo sin modificarlo.

## Tasks

| ID | Linked S# | Route | Status | Commit/Evidence |
|----|-----------|-------|--------|------------------|
| T1 | S1-S4 | inline (parent) | done | ver Log |

## Log

- **L1** (verbatim): Usuario, tras cerrar #81, pidió documentar el gap de la Final como issue nuevo ("armalo") → creado #88. Luego pidió arrancarlo ("empiezalas").
- Investigación: el avance real vive en infraestructura (`PrismaTournamentMatchResultRepository.registerResultAndAdvanceSV`), no en el use case de aplicación — `_advanceSingleEliminationIfApplicableSV` ya existía, gateado por `formatCode !== 'SINGLE_ELIMINATION'`. Los Match de semifinal GPK usan el mismo `formatParameters: {scheduleKey, roundNumber, matchNumber}` que SE, así que `_listPlayedSingleEliminationResultsSV` (a pesar del nombre) es 100% genérico y reutilizable sin cambios.
- Implementación: nuevo método hermano `_advanceGroupsPlusKnockoutFinalIfApplicableSV`, llamado junto al de SE (ambos se auto-excluyen por `formatCode`, nunca corren los dos para el mismo torneo). Reutiliza `resolveSingleEliminationAdvancementParticipantsSV` (genérico) para expandir duplas — no se tocó el generador de dominio (`groups_plus_knockout_schedule_generator.ts`) ni se creó una abstracción nueva de "progreso" multi-ronda, porque la Final de GPK v1 es un único slot fijo.
- RED confirmado (test de integración HTTP+DB nuevo) → GREEN. Regresión: suite completo de avance SE (7 tests) + unit de bracket + unit de advance-GPK, sin cambios, todos verdes. Typecheck y lint limpios.
