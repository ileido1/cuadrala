export type TournamentSlotResponseValue = 'ACCEPTED' | 'REJECTED';

export type TournamentSlotDecision = 'PENDING' | 'ACCEPTED' | 'REJECTED';

/**
 * Que hacer con el turno apartado de un partido, segun lo que contestaron sus
 * jugadores.
 *
 * `ACCEPTED` confirma la cancha, `REJECTED` la suelta y le devuelve el partido
 * al organizador, `PENDING` la deja apartada hasta que venza.
 *
 * Solo cuentan los jugadores con cuenta: los invitados sin cuenta juegan pero
 * no tienen donde aceptar, y esperarlos dejaria el turno colgado hasta el
 * vencimiento siempre.
 */
export function resolveSlotDecisionSV(_input: {
  participantUserIds: string[];
  responses: Array<{ userId: string; response: TournamentSlotResponseValue }>;
}): TournamentSlotDecision {
  const PARTICIPANTS = new Set(_input.participantUserIds);

  //? Solo se miran las respuestas de quienes juegan ese partido: una respuesta
  //? de otro no puede decidir por ellos.
  const RELEVANT = _input.responses.filter((_r) => PARTICIPANTS.has(_r.userId));

  if (RELEVANT.some((_r) => _r.response === 'REJECTED')) return 'REJECTED';

  const ACCEPTED = new Set(
    RELEVANT.filter((_r) => _r.response === 'ACCEPTED').map((_r) => _r.userId),
  );

  //? Un partido sin jugadores con cuenta se da por aceptado; si no, quedaria
  //? esperando una respuesta que nadie puede dar.
  return ACCEPTED.size >= PARTICIPANTS.size ? 'ACCEPTED' : 'PENDING';
}
