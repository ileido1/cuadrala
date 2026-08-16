import { describe, expect, it, vi } from 'vitest';

import { RecordPlayerPaymentSelectionUseCase } from '../../application/use_cases/record_player_payment_selection.use_case.js';
import { UploadTransactionReceiptUseCase } from '../../application/use_cases/upload_transaction_receipt.use_case.js';
import type { TransactionReceiptNotifyContextDTO } from '../../domain/ports/transaction_receipt_notify_context_repository.js';

function buildCtxSV(
  _overrides: Partial<TransactionReceiptNotifyContextDTO> = {},
): TransactionReceiptNotifyContextDTO {
  return {
    matchId: 'match-1',
    categoryId: 'cat-1',
    organizerUserId: 'organizer-1',
    payerUserId: 'payer-1',
    venueId: 'venue-1',
    venueStaffUserIds: ['staff-1', 'staff-2'],
    ..._overrides,
  };
}

type EventCall = {
  matchId: string;
  categoryId: string;
  userIds: string[];
  payload: unknown;
};

function staffCallsOf(_calls: EventCall[]): EventCall[] {
  return _calls.filter(
    (_call) => (_call.payload as { kind: string }).kind === 'VENUE_PAYMENT_PENDING',
  );
}

describe('RecordPlayerPaymentSelectionUseCase — notificación a staff de sede', () => {
  function buildUcSV(_ctx: TransactionReceiptNotifyContextDTO | null, _eventImpl?: (
    _dto: EventCall,
  ) => Promise<{ eventId: string; createdDeliveries: number }>) {
    const TX_REPO = {
      recordPlayerPaymentSelectionSV: vi.fn().mockResolvedValue(undefined),
    };
    const ACCESS = {
      userCanAccessTransactionSV: vi.fn().mockResolvedValue(true),
    };
    const NOTIFY_CONTEXT = {
      getForTransactionSV: vi.fn().mockResolvedValue(_ctx),
    };
    const CREATE_EVENT = {
      executeSV: vi.fn(
        _eventImpl
          ?? (async () => ({ eventId: 'event-1', createdDeliveries: 1 })),
      ),
    };
    const UC = new RecordPlayerPaymentSelectionUseCase(
      TX_REPO as never,
      ACCESS as never,
      NOTIFY_CONTEXT as never,
      CREATE_EVENT as never,
    );
    return { UC, TX_REPO, ACCESS, NOTIFY_CONTEXT, CREATE_EVENT };
  }

  it('should notify every venue staff user in addition to the organizer', async () => {
    const CTX = buildCtxSV();
    const { UC, CREATE_EVENT } = buildUcSV(CTX);

    await UC.executeSV({ transactionId: 'tx-1', actorUserId: CTX.payerUserId });

    const CALLS = CREATE_EVENT.executeSV.mock.calls.map((_c) => _c[0] as EventCall);
    expect(CALLS).toHaveLength(2);

    const ORGANIZER_CALL = CALLS.find(
      (_c) => (_c.payload as { kind: string }).kind === 'PAYMENT_METHOD_SELECTED',
    );
    expect(ORGANIZER_CALL?.userIds).toEqual([CTX.organizerUserId]);

    const STAFF_CALL = staffCallsOf(CALLS)[0]!;
    expect(STAFF_CALL.userIds.sort()).toEqual(['staff-1', 'staff-2']);
    expect(STAFF_CALL.payload).toMatchObject({
      kind: 'VENUE_PAYMENT_PENDING',
      venueId: CTX.venueId,
      transactionId: 'tx-1',
      payerUserId: CTX.payerUserId,
    });
  });

  it('should exclude a staff member who is also the payer from their own notification', async () => {
    const CTX = buildCtxSV({ venueStaffUserIds: [ 'payer-1', 'staff-2' ] });
    const { UC, CREATE_EVENT } = buildUcSV(CTX);

    await UC.executeSV({ transactionId: 'tx-1', actorUserId: CTX.payerUserId });

    const CALLS = CREATE_EVENT.executeSV.mock.calls.map((_c) => _c[0] as EventCall);
    const STAFF_CALL = staffCallsOf(CALLS)[0]!;
    expect(STAFF_CALL.userIds).toEqual(['staff-2']);
  });

  it('should exclude the organizer from the staff list when the organizer already received the payer-distinct notification', async () => {
    const CTX = buildCtxSV({ venueStaffUserIds: ['organizer-1', 'staff-2'] });
    const { UC, CREATE_EVENT } = buildUcSV(CTX);

    await UC.executeSV({ transactionId: 'tx-1', actorUserId: CTX.payerUserId });

    const CALLS = CREATE_EVENT.executeSV.mock.calls.map((_c) => _c[0] as EventCall);
    expect(CALLS).toHaveLength(2);
    const STAFF_CALL = staffCallsOf(CALLS)[0]!;
    expect(STAFF_CALL.userIds).toEqual(['staff-2']);
  });

  it('should not emit a staff event when venueId is null', async () => {
    const CTX = buildCtxSV({ venueId: null, venueStaffUserIds: [] });
    const { UC, CREATE_EVENT } = buildUcSV(CTX);

    await UC.executeSV({ transactionId: 'tx-1', actorUserId: CTX.payerUserId });

    const CALLS = CREATE_EVENT.executeSV.mock.calls.map((_c) => _c[0] as EventCall);
    expect(staffCallsOf(CALLS)).toHaveLength(0);
  });

  it('should not emit a staff event when the recipient list is empty after exclusions', async () => {
    const CTX = buildCtxSV({ venueStaffUserIds: ['payer-1'] });
    const { UC, CREATE_EVENT } = buildUcSV(CTX);

    await UC.executeSV({ transactionId: 'tx-1', actorUserId: CTX.payerUserId });

    const CALLS = CREATE_EVENT.executeSV.mock.calls.map((_c) => _c[0] as EventCall);
    expect(staffCallsOf(CALLS)).toHaveLength(0);
  });

  it('should notify staff even when the actor recording the selection differs from the resolved payer', async () => {
    const CTX = buildCtxSV();
    const { UC, CREATE_EVENT } = buildUcSV(CTX);

    // actorUserId distinto del payer: el camino organizador (a) no dispara (guard existente),
    // pero el aviso a staff (b) no depende de la identidad del pagador/organizador (REQ-VSN-002).
    await UC.executeSV({ transactionId: 'tx-1', actorUserId: 'someone-else' });

    const CALLS = CREATE_EVENT.executeSV.mock.calls.map((_c) => _c[0] as EventCall);
    expect(staffCallsOf(CALLS)).toHaveLength(1);
  });

  it('should still notify the organizer when the staff emission fails', async () => {
    const CTX = buildCtxSV();
    const { UC, CREATE_EVENT } = buildUcSV(CTX, async (_dto) => {
      if ((_dto.payload as { kind: string }).kind === 'VENUE_PAYMENT_PENDING') {
        throw new Error('boom-staff');
      }
      return { eventId: 'event-1', createdDeliveries: 1 };
    });

    await expect(
      UC.executeSV({ transactionId: 'tx-1', actorUserId: CTX.payerUserId }),
    ).resolves.toEqual({ recorded: true });

    const CALLS = CREATE_EVENT.executeSV.mock.calls.map((_c) => _c[0] as EventCall);
    expect(
      CALLS.some((_c) => (_c.payload as { kind: string }).kind === 'PAYMENT_METHOD_SELECTED'),
    ).toBe(true);
  });

  it('should still notify staff when the organizer emission fails', async () => {
    const CTX = buildCtxSV();
    const { UC, CREATE_EVENT } = buildUcSV(CTX, async (_dto) => {
      if ((_dto.payload as { kind: string }).kind === 'PAYMENT_METHOD_SELECTED') {
        throw new Error('boom-organizer');
      }
      return { eventId: 'event-1', createdDeliveries: 1 };
    });

    await expect(
      UC.executeSV({ transactionId: 'tx-1', actorUserId: CTX.payerUserId }),
    ).resolves.toEqual({ recorded: true });

    const CALLS = CREATE_EVENT.executeSV.mock.calls.map((_c) => _c[0] as EventCall);
    expect(staffCallsOf(CALLS)).toHaveLength(1);
  });
});

describe('UploadTransactionReceiptUseCase — notificación a staff de sede', () => {
  function buildUcSV(_ctx: TransactionReceiptNotifyContextDTO | null, _eventImpl?: (
    _dto: EventCall,
  ) => Promise<{ eventId: string; createdDeliveries: number }>) {
    const ACCESS = {
      transactionExistsSV: vi.fn().mockResolvedValue(true),
      userCanAccessTransactionSV: vi.fn().mockResolvedValue(true),
      getPlayerPaymentMethodTypeSV: vi.fn().mockResolvedValue('TRANSFER'),
    };
    const STORAGE = { putSV: vi.fn().mockResolvedValue({ storageKey: 'receipts/tx-1/r1.png' }) };
    const RECEIPT_REPO = {
      createSV: vi.fn().mockResolvedValue({
        id: 'receipt-1',
        transactionId: 'tx-1',
        uploaderUserId: 'payer-1',
        mimeType: 'image/png',
        sizeBytes: 100,
        storageKey: 'receipts/tx-1/r1.png',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    };
    const NOTIFY_CONTEXT = { getForTransactionSV: vi.fn().mockResolvedValue(_ctx) };
    const CREATE_EVENT = {
      executeSV: vi.fn(
        _eventImpl
          ?? (async () => ({ eventId: 'event-1', createdDeliveries: 1 })),
      ),
    };
    const UC = new UploadTransactionReceiptUseCase(
      STORAGE as never,
      RECEIPT_REPO as never,
      ACCESS as never,
      NOTIFY_CONTEXT as never,
      CREATE_EVENT as never,
    );
    const INPUT = {
      transactionId: 'tx-1',
      actorUserId: 'payer-1',
      mimeType: 'image/png',
      sizeBytes: 100,
      content: Buffer.from('x'),
    };
    return { UC, INPUT, NOTIFY_CONTEXT, CREATE_EVENT };
  }

  it('should notify every venue staff user with the receiptId in addition to the organizer', async () => {
    const CTX = buildCtxSV();
    const { UC, INPUT, CREATE_EVENT } = buildUcSV(CTX);

    await UC.executeSV(INPUT);

    const CALLS = CREATE_EVENT.executeSV.mock.calls.map((_c) => _c[0] as EventCall);
    const STAFF_CALL = staffCallsOf(CALLS)[0]!;
    expect(STAFF_CALL.userIds.sort()).toEqual(['staff-1', 'staff-2']);
    expect(STAFF_CALL.payload).toMatchObject({
      kind: 'VENUE_PAYMENT_PENDING',
      venueId: CTX.venueId,
      transactionId: 'tx-1',
      payerUserId: CTX.payerUserId,
      receiptId: 'receipt-1',
    });
  });

  it('should exclude a staff member who is also the payer from their own notification', async () => {
    const CTX = buildCtxSV({ venueStaffUserIds: ['payer-1', 'staff-2'] });
    const { UC, INPUT, CREATE_EVENT } = buildUcSV(CTX);

    await UC.executeSV(INPUT);

    const CALLS = CREATE_EVENT.executeSV.mock.calls.map((_c) => _c[0] as EventCall);
    const STAFF_CALL = staffCallsOf(CALLS)[0]!;
    expect(STAFF_CALL.userIds).toEqual(['staff-2']);
  });

  it('should not emit a staff event when venueId is null', async () => {
    const CTX = buildCtxSV({ venueId: null, venueStaffUserIds: [] });
    const { UC, INPUT, CREATE_EVENT } = buildUcSV(CTX);

    await UC.executeSV(INPUT);

    const CALLS = CREATE_EVENT.executeSV.mock.calls.map((_c) => _c[0] as EventCall);
    expect(staffCallsOf(CALLS)).toHaveLength(0);
  });

  it('should not bubble up an error and should still complete the upload when the notify-context lookup fails', async () => {
    const { UC, INPUT, NOTIFY_CONTEXT } = buildUcSV(buildCtxSV());
    NOTIFY_CONTEXT.getForTransactionSV.mockRejectedValue(new Error('boom-context'));

    await expect(UC.executeSV(INPUT)).resolves.toMatchObject({
      receipt: { id: 'receipt-1' },
    });
  });
});
