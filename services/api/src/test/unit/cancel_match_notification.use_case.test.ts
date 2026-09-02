import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminCancelMatchUseCase } from '../../application/use_cases/admin_cancel_match.use_case.js';
import { CancelMatchUseCase } from '../../application/use_cases/cancel_match.use_case.js';

const MATCH_ID = 'match-1';
const ORGANIZER_ID = 'user-organizer';
const CATEGORY_ID = 'cat-1';

function createMocks() {
  return {
    query: {
      getMatchByIdSV: vi.fn().mockResolvedValue({
        id: MATCH_ID,
        status: 'SCHEDULED',
        categoryId: CATEGORY_ID,
      }),
    },
    organizer: {
      getOrganizerUserIdByMatchIdSV: vi.fn().mockResolvedValue(ORGANIZER_ID),
    },
    crud: {
      cancelMatchSV: vi.fn().mockResolvedValue({ id: MATCH_ID, status: 'CANCELLED' }),
    },
    participation: {
      listParticipantUserIdsSV: vi.fn().mockResolvedValue([ORGANIZER_ID, 'user-2', 'user-3']),
    },
    notification: {
      executeSV: vi.fn().mockResolvedValue({ eventId: 'ev-1', createdDeliveries: 2 }),
    },
  };
}

type Mocks = ReturnType<typeof createMocks>;

function buildUseCase(_m: Mocks): CancelMatchUseCase {
  return new CancelMatchUseCase(
    _m.query as never,
    _m.organizer as never,
    _m.crud as never,
    _m.participation as never,
    _m.notification as never,
  );
}

describe('CancelMatchUseCase notifications', () => {
  let mocks: Mocks;

  beforeEach(() => {
    mocks = createMocks();
  });

  it('should notify the other participants when a match is cancelled', async () => {
    await buildUseCase(mocks).executeSV(MATCH_ID, ORGANIZER_ID);

    expect(mocks.notification.executeSV).toHaveBeenCalledTimes(1);
    const [DTO] = mocks.notification.executeSV.mock.calls[0] as [
      { matchId: string; categoryId: string; userIds: string[] },
    ];
    expect(DTO.matchId).toBe(MATCH_ID);
    expect(DTO.categoryId).toBe(CATEGORY_ID);
    //? Al que cancela no se le avisa: ya sabe.
    expect(DTO.userIds).toEqual(['user-2', 'user-3']);
  });

  it('should not notify when the organizer is the only participant', async () => {
    mocks.participation.listParticipantUserIdsSV.mockResolvedValue([ORGANIZER_ID]);

    await buildUseCase(mocks).executeSV(MATCH_ID, ORGANIZER_ID);

    expect(mocks.notification.executeSV).not.toHaveBeenCalled();
  });

  it('should still cancel when creating the notification fails', async () => {
    //? La notificacion es best-effort: que falle no puede dejar el partido sin
    //? cancelar, porque la cancelacion ya se escribio.
    mocks.notification.executeSV.mockRejectedValue(new Error('notificaciones caidas'));

    const RESULT = await buildUseCase(mocks).executeSV(MATCH_ID, ORGANIZER_ID);

    expect(RESULT).toMatchObject({ status: 'CANCELLED' });
    expect(mocks.crud.cancelMatchSV).toHaveBeenCalledWith(MATCH_ID);
  });

  it('should not notify when a non-organizer attempts the cancellation', async () => {
    await expect(buildUseCase(mocks).executeSV(MATCH_ID, 'intruso')).rejects.toMatchObject({
      statusCode: 403,
    });

    expect(mocks.crud.cancelMatchSV).not.toHaveBeenCalled();
    expect(mocks.notification.executeSV).not.toHaveBeenCalled();
  });
});

describe('AdminCancelMatchUseCase notifications', () => {
  it('should notify every participant, since no person cancelled', () => {
    const MOCKS = createMocks();
    const USE_CASE = new AdminCancelMatchUseCase(
      MOCKS.query as never,
      MOCKS.crud as never,
      MOCKS.participation as never,
      MOCKS.notification as never,
    );

    return USE_CASE.executeSV(MATCH_ID).then(() => {
      expect(MOCKS.notification.executeSV).toHaveBeenCalledTimes(1);
      const [DTO] = MOCKS.notification.executeSV.mock.calls[0] as [{ userIds: string[] }];
      //? La ruta admin se autentica con un secreto: no hay actor a quien excluir.
      expect(DTO.userIds).toEqual([ORGANIZER_ID, 'user-2', 'user-3']);
    });
  });
});
