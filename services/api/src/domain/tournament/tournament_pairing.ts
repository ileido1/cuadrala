import { AppError } from '../errors/app_error.js';

export type PairableRegistration = {
  id: string;
  tournamentId: string;
  status: string;
  partnerRegistrationId: string | null;
};

/**
 * Reglas para armar una dupla fija en un torneo de parejas.
 *
 * En el MVP las duplas las arma el organizador: el jugador se inscribe solo,
 * como siempre, y el organizador empareja. Eso saca de encima el problema de
 * las dos partes —invitar, esperar respuesta, vencer— que es el que hace caro
 * el auto-emparejamiento.
 *
 * Funcion de dominio pura: valida y lanza; no toca base ni conoce al actor.
 */
export function assertPairableSV(_input: {
  tournamentId: string;
  pairedRegistration: boolean;
  first: PairableRegistration | null;
  second: PairableRegistration | null;
}): void {
  if (!_input.pairedRegistration) {
    throw new AppError(
      'TORNEO_NO_ES_DE_PAREJAS',
      'Este torneo no se juega en duplas fijas.',
      409,
    );
  }

  const { first: FIRST, second: SECOND } = _input;

  if (FIRST === null || SECOND === null) {
    throw new AppError('INSCRIPCION_NO_ENCONTRADA', 'La inscripción indicada no existe.', 404);
  }

  if (FIRST.id === SECOND.id) {
    throw new AppError(
      'VALIDACION_FALLIDA',
      'Una inscripción no puede formar dupla consigo misma.',
      400,
    );
  }

  //? Emparejar inscripciones de torneos distintos mezclaria dos cuadros.
  if (
    FIRST.tournamentId !== _input.tournamentId ||
    SECOND.tournamentId !== _input.tournamentId
  ) {
    throw new AppError(
      'INSCRIPCION_NO_ENCONTRADA',
      'Alguna de las inscripciones no pertenece a este torneo.',
      404,
    );
  }

  //? Una inscripcion retirada no juega: emparejarla dejaria media dupla en el
  //? cuadro el dia que se confirme la otra mitad.
  if (FIRST.status === 'WITHDRAWN' || SECOND.status === 'WITHDRAWN') {
    throw new AppError(
      'VALIDACION_FALLIDA',
      'No se puede emparejar una inscripción retirada.',
      409,
    );
  }

  //? El indice unico de la base tambien lo impide, pero un 409 explicito le
  //? dice al organizador que primero tiene que deshacer la dupla anterior.
  for (const REG of [FIRST, SECOND]) {
    if (REG.partnerRegistrationId !== null && REG.partnerRegistrationId !== otherIdSV(REG, FIRST, SECOND)) {
      throw new AppError(
        'YA_TIENE_DUPLA',
        'Alguno de los jugadores ya está en otra dupla. Deshacela antes.',
        409,
      );
    }
  }
}

function otherIdSV(
  _reg: PairableRegistration,
  _first: PairableRegistration,
  _second: PairableRegistration,
): string {
  return _reg.id === _first.id ? _second.id : _first.id;
}

/**
 * Colapsa el roster confirmado a un participante por dupla.
 *
 * El cuadro se genera sobre "competidores", y en un torneo de parejas el
 * competidor es la dupla, no la persona. Se toma el id mas chico de cada dupla
 * como token para que el resultado sea determinista: el `scheduleKey` depende
 * de esta lista y tiene que dar igual en cada corrida.
 *
 * Una inscripcion sin dupla queda afuera: media pareja no compite.
 */
export function collapsePairsToCompetitorsSV(
  _registrations: Array<{ id: string; partnerRegistrationId: string | null }>,
): { competitorIds: string[]; unpairedIds: string[] } {
  const BY_ID = new Map(_registrations.map((_r) => [_r.id, _r]));
  const COMPETITORS: string[] = [];
  const UNPAIRED: string[] = [];
  const SEEN = new Set<string>();

  for (const REG of _registrations) {
    if (SEEN.has(REG.id)) continue;

    const PARTNER_ID = REG.partnerRegistrationId;
    //? El companero tiene que estar tambien en la lista: si quedo fuera del
    //? roster confirmado, esta dupla no esta completa.
    if (PARTNER_ID === null || !BY_ID.has(PARTNER_ID)) {
      UNPAIRED.push(REG.id);
      SEEN.add(REG.id);
      continue;
    }

    SEEN.add(REG.id);
    SEEN.add(PARTNER_ID);
    COMPETITORS.push(REG.id < PARTNER_ID ? REG.id : PARTNER_ID);
  }

  return { competitorIds: COMPETITORS.sort(), unpairedIds: UNPAIRED };
}
