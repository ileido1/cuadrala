import { describe, expect, it } from 'vitest';

import { DispatchNotificationsUseCase } from '../../application/use_cases/dispatch_notifications.use_case.js';

//? Push de partida rápida: el texto depende de `payload.kind`, igual que la lista in-app.
//? Los demás tipos de evento mandan exactamente el mismo texto que antes.
async function pushedFor(_event: { type: string; payload?: unknown }): Promise<{ title: string; body: string }> {
  const SENT: Array<{ title: string; body: string }> = [];
  const DELIVERY = {
    deliveryId: 'd1', eventId: 'e1', userId: 'u1', status: 'PENDING', attemptCount: 0, nextAttemptAt: null,
    event: { type: _event.type, matchId: null, tournamentId: null, categoryId: 'c1', payload: _event.payload ?? null },
  };
  const UC = new DispatchNotificationsUseCase(
    { countPendingSV: async () => 0, listPendingSV: async () => [], markProcessedSV: async () => undefined } as never,
    {} as never,
    {
      countBacklogSV: async () => 1, listDueDeliveriesWithEventSV: async () => [DELIVERY], markSentSV: async () => undefined,
      markFailedSV: async () => undefined, countOutstandingByEventIdSV: async () => 0,
    } as never,
    {} as never,
    {} as never,
    { listEnabledTokensByUserIdsSV: async () => [{ userId: 'u1', token: 't1' }], disableByProviderTokenSV: async () => ({ updatedCount: 0 }) } as never,
    { sendToDeviceTokensSV: async (_tokens: string[], _message: { title: string; body: string }) => { SENT.push({ title: _message.title, body: _message.body }); return { successCount: 1, failureCount: 0, failures: [] }; } } as never,
  );
  await UC.executeSV();
  expect(SENT).toHaveLength(1);
  return SENT[0]!;
}

describe('Quick match push content', () => {
  it('should push the match-found text for a ready check', async () => {
    expect(await pushedFor({ type: 'QUICK_MATCH_PROPOSAL', payload: { kind: 'READY_CHECK' } })).toEqual({ title: 'Encontramos una partida', body: 'Tenés una propuesta lista para confirmar.' });
  });

  it('should push the invitation text for an availability invitation', async () => {
    expect(await pushedFor({ type: 'QUICK_MATCH_PROPOSAL', payload: { kind: 'INVITATION' } })).toEqual({ title: 'Hay un grupo armándose a tu horario, ¿te sumás?', body: 'Aceptá la invitación para entrar al grupo de partida rápida.' });
  });

  it('should push how many players the lobby has when someone joins it', async () => {
    expect(await pushedFor({ type: 'QUICK_MATCH_PROPOSAL', payload: { kind: 'LOBBY_JOINED', memberCount: 2 } })).toEqual({ title: 'Se sumó un jugador (2 de 4)', body: 'Tu grupo de partida rápida se está armando.' });
  });

  it('should keep the push text of unrelated event types unchanged', async () => {
    expect(await pushedFor({ type: 'PAYMENT_PENDING', payload: { kind: 'INVITATION' } })).toEqual({ title: 'Pago pendiente', body: 'Hay un pago pendiente de revisión en tu partida.' });
  });
});
