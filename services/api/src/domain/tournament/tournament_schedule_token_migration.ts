/**
 * Migración de tokens de `TournamentSchedule.payload`: `userId` → `TournamentRegistration.id`.
 *
 * Slice 1 (tournament-guest-registration) cambió el token de participante que
 * viaja en el payload de un schedule de `userId` a `registrationId` (las
 * inscripciones GUEST no tienen `userId`). Un schedule generado antes de este
 * cambio queda con tokens `userId` obsoletos, que `MaterializeTournamentMatchesUseCase`
 * rechaza con 409 `CALENDARIO_OBSOLETO`.
 *
 * `remapScheduleTokensSV` es la función de dominio pura que hace la conversión:
 * recorre el payload (agnóstico al formato — no necesita conocer AMERICANO vs
 * ROUND_ROBIN vs SINGLE_ELIMINATION) y reemplaza cada string hoja que coincida
 * con una clave de `_tokenMap` por su valor mapeado. La usa el script de
 * migración one-off (`scripts/migrate-stale-tournament-schedules.ts`), que
 * construye `_tokenMap` a partir de las inscripciones AUTHENTICATED del torneo
 * (userId -> registration.id).
 */
export function remapScheduleTokensSV(_value: unknown, _tokenMap: Map<string, string>): unknown {
  //? 1. String hoja: sustituir si coincide con un userId conocido, si no dejar igual
  if (typeof _value === 'string') {
    return _tokenMap.get(_value) ?? _value;
  }

  //? 2. Array: recorrer cada elemento (ej. teamA/teamB en AMERICANO)
  if (Array.isArray(_value)) {
    return _value.map((_item) => remapScheduleTokensSV(_item, _tokenMap));
  }

  //? 3. Objeto: recorrer cada propiedad (ej. playerA/playerB en ROUND_ROBIN/SINGLE_ELIMINATION)
  if (_value !== null && typeof _value === 'object') {
    const OUT: Record<string, unknown> = {};
    for (const [KEY, VAL] of Object.entries(_value)) {
      OUT[KEY] = remapScheduleTokensSV(VAL, _tokenMap);
    }
    return OUT;
  }

  //? 4. number / boolean / null: no son tokens de participante, se dejan igual
  return _value;
}
