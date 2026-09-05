import { describe, expect, it } from 'vitest';

import { resolveSlotDecisionSV } from '../../domain/tournament/tournament_slot_decision.js';

describe('resolveSlotDecisionSV', () => {
  it('should stay pending while somebody has not answered', () => {
    const D = resolveSlotDecisionSV({
      participantUserIds: ['user-1', 'user-2'],
      responses: [{ userId: 'user-1', response: 'ACCEPTED' }],
    });

    expect(D).toBe('PENDING');
  });

  it('should accept the slot once every player accepted', () => {
    const D = resolveSlotDecisionSV({
      participantUserIds: ['user-1', 'user-2'],
      responses: [
        { userId: 'user-1', response: 'ACCEPTED' },
        { userId: 'user-2', response: 'ACCEPTED' },
      ],
    });

    expect(D).toBe('ACCEPTED');
  });

  //? Un solo rechazo alcanza: no tiene sentido esperar al resto si ya se sabe
  //? que ese horario no va. El organizador lo mueve antes.
  it('should reject as soon as one player says no', () => {
    const D = resolveSlotDecisionSV({
      participantUserIds: ['user-1', 'user-2', 'user-3'],
      responses: [{ userId: 'user-2', response: 'REJECTED' }],
    });

    expect(D).toBe('REJECTED');
  });

  //? Los invitados sin cuenta juegan pero no tienen donde aceptar. Exigirles
  //? respuesta dejaria el turno colgado hasta que venza, siempre.
  it('should not wait for guests, who have no way to answer', () => {
    const D = resolveSlotDecisionSV({
      participantUserIds: ['user-1'],
      responses: [{ userId: 'user-1', response: 'ACCEPTED' }],
    });

    expect(D).toBe('ACCEPTED');
  });

  //? Un partido enteramente de invitados no puede quedar esperando para
  //? siempre: se toma por aceptado y lo gobierna el organizador.
  it('should accept a match played only by guests', () => {
    const D = resolveSlotDecisionSV({ participantUserIds: [], responses: [] });

    expect(D).toBe('ACCEPTED');
  });

  it('should ignore answers from somebody who is not in the match', () => {
    const D = resolveSlotDecisionSV({
      participantUserIds: ['user-1'],
      responses: [
        { userId: 'user-1', response: 'ACCEPTED' },
        { userId: 'intruso', response: 'REJECTED' },
      ],
    });

    expect(D).toBe('ACCEPTED');
  });
});
