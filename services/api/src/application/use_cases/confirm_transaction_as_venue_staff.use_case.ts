import { AppError } from '../../domain/errors/app_error.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';
import type { PaymentTransactionRepository } from '../../domain/ports/payment_transaction_repository.js';
import type { VenuePaymentMethodRepository } from '../../domain/ports/venue_payment_method_repository.js';
import type { MoneyConversionService } from '../../domain/ports/money_conversion_service.js';
import type { McpConfirmPayload } from '../../domain/ports/venue_staff_transaction_repository.js';
import type { StaffTransactionRow } from '../../domain/ports/venue_staff_transaction_repository.js';
import { parseCurrencyCode } from '../../domain/money/currency_code.js';
import type { CurrencyCode } from '../../domain/money/currency_code.js';
import { MoneyAmount } from '../../domain/money/money_amount.js';
import { MoneyDomainError } from '../../domain/money/money_errors.js';
import { moneyAmountDtoFromMinorSV } from '../dto/money.dto.js';
import type { MoneyAmountDTO } from '../dto/money.dto.js';
import {
  isMultiCurrencyPaymentsEnabledSV,
  isReservationPaymentLedgerEnabledSV,
} from '../../config/feature_flags.js';
import type { RecordReservationLedgerEntryUseCase } from './record_reservation_ledger_entry.use_case.js';
import { GetRateForReservationDayUseCase } from './get_rate_for_reservation_day.use_case.js';

function majorToMinorSV(_major: string): bigint {
  return BigInt(Math.round(Number(_major) * 100));
}

export class ConfirmTransactionAsVenueStaffUseCase {
  constructor(
    private readonly _venueStaffRepository: VenueStaffRepository,
    private readonly _transactionRepository: PaymentTransactionRepository,
    private readonly _venuePaymentMethodRepository: VenuePaymentMethodRepository,
    private readonly _moneyConversionService: MoneyConversionService,
    private readonly _getRateForReservationDayUseCase: GetRateForReservationDayUseCase,
    private readonly _recordReservationLedgerEntryUseCase?: RecordReservationLedgerEntryUseCase,
  ) {}

  async executeSV(_input: {
    transactionId: string;
    userId: string;
    venuePaymentMethodId?: string;
    settlementAmount?: { amountMinor: bigint; currencyCode: CurrencyCode };
    referenceNumber?: string;
    paymentData?: object;
  }): Promise<{
    id: string;
    status: string;
    confirmedAt: string;
    settlementAmount?: MoneyAmountDTO;
    appliedToObligation?: MoneyAmountDTO;
    reservationPayment?: {
      paidAmount: MoneyAmountDTO;
      totalAmount: MoneyAmountDTO | null;
      paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
    };
  }> {
    const TX = await this._transactionRepository.findForStaffConfirmSV(
      _input.transactionId,
    );

    if (!TX) {
      throw new AppError('TRANSACCION_NO_ENCONTRADA', 'La transacción indicada no existe.', 404);
    }
    if (TX.status === 'CONFIRMED') {
      return {
        id: TX.id,
        status: TX.status,
        confirmedAt: TX.confirmedAt?.toISOString() ?? '',
      };
    }
    if (TX.status !== 'PENDING') {
      throw new AppError(
        'TRANSACCION_NO_PENDIENTE',
        'Solo se pueden confirmar transacciones pendientes.',
        400,
      );
    }

    const VENUE_ID = this.resolveVenueIdSV(TX);
    if (VENUE_ID === null) {
      throw new AppError(
        'ENTIDAD_SIN_SEDE',
        'La transacción no tiene una sede asignada. No se puede confirmar el pago.',
        400,
      );
    }

    const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(
      _input.userId,
      VENUE_ID,
    );
    if (!IS_STAFF) {
      throw new AppError(
        'NO_AUTORIZADO',
        'Solo el staff de la sede puede confirmar pagos.',
        403,
      );
    }

    if (
      isMultiCurrencyPaymentsEnabledSV()
      && TX.reservationId !== null
      && _input.settlementAmount === undefined
    ) {
      throw new AppError(
        'SETTLEMENT_AMOUNT_REQUERIDO',
        'settlementAmount es obligatorio para confirmar pagos de reserva con multi-moneda activo.',
        400,
      );
    }

    let MCP: McpConfirmPayload | undefined;
    if (
      isMultiCurrencyPaymentsEnabledSV()
      && TX.reservationId !== null
      && TX.reservation !== undefined
    ) {
      try {
        MCP = await this.buildMcpConfirmPayloadSV(
          TX,
          _input.venuePaymentMethodId,
          _input.settlementAmount,
        );
      } catch (_error) {
        if (_error instanceof MoneyDomainError) {
          throw new AppError(_error.code, _error.message, 422);
        }
        throw _error;
      }
    }

    const UPDATED = await this._transactionRepository.confirmManualSV({
      transactionId: _input.transactionId,
      venuePaymentMethodId: _input.venuePaymentMethodId,
      referenceNumber: _input.referenceNumber,
      paymentData: _input.paymentData,
      confirmedBy: _input.userId,
      mcp: MCP,
    });

    if (
      isReservationPaymentLedgerEnabledSV()
      && MCP !== undefined
      && TX.reservationId !== null
      && this._recordReservationLedgerEntryUseCase !== undefined
    ) {
      await this._recordReservationLedgerEntryUseCase.executeSV({
        reservationId: TX.reservationId,
        transactionId: UPDATED.id,
        appliedToObligationMinor: MCP.appliedToObligationMinor,
        pricingCurrency: MCP.pricingCurrency,
        amountBsMinor: MCP.amountBsMinor,
        actorUserId: _input.userId,
      });
    }

    let SYNCED:
      | Awaited<ReturnType<PaymentTransactionRepository['syncReservationPaymentSV']>>
      | undefined;
    if (TX.reservationId !== null) {
      SYNCED = await this._transactionRepository.syncReservationPaymentSV(
        TX.reservationId,
      );
    }

    const RESULT: {
      id: string;
      status: string;
      confirmedAt: string;
      settlementAmount?: MoneyAmountDTO;
      appliedToObligation?: MoneyAmountDTO;
      reservationPayment?: {
        paidAmount: MoneyAmountDTO;
        totalAmount: MoneyAmountDTO | null;
        paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
      };
    } = {
      id: UPDATED.id,
      status: UPDATED.status,
      confirmedAt: UPDATED.confirmedAt.toISOString(),
    };

    if (MCP !== undefined) {
      RESULT.settlementAmount = moneyAmountDtoFromMinorSV(
        MCP.settlementCurrency,
        MCP.settlementAmountMinor,
      );
      RESULT.appliedToObligation = moneyAmountDtoFromMinorSV(
        MCP.pricingCurrency,
        MCP.appliedToObligationMinor,
      );
    }

    if (SYNCED !== undefined) {
      RESULT.reservationPayment = {
        paidAmount: moneyAmountDtoFromMinorSV(
          SYNCED.pricingCurrency,
          SYNCED.paidAmountMinor,
        ),
        totalAmount:
          SYNCED.totalAmountMinor !== null
            ? moneyAmountDtoFromMinorSV(
                SYNCED.pricingCurrency,
                SYNCED.totalAmountMinor,
              )
            : null,
        paymentStatus: SYNCED.paymentStatus,
      };
    }

    return RESULT;
  }

  private resolveVenueIdSV(_tx: StaffTransactionRow): string | null {
    if (_tx.matchId !== null) {
      return _tx.match?.court?.venueId ?? null;
    }
    if (_tx.reservationId !== null) {
      return (
        _tx.reservation?.venueId
        ?? _tx.reservation?.court?.venueId
        ?? null
      );
    }
    return null;
  }

  private async buildMcpConfirmPayloadSV(
    _tx: StaffTransactionRow,
    _venuePaymentMethodId?: string,
    _settlementAmount?: { amountMinor: bigint; currencyCode: CurrencyCode },
  ): Promise<McpConfirmPayload> {
    const RESERVATION = _tx.reservation!;
    const OBLIGATION_CURRENCY = parseCurrencyCode(RESERVATION.pricingCurrency);
    const TIMEZONE =
      RESERVATION.venue.monetizationSettings?.timezone ?? 'America/Caracas';
    const COUNTRY_CODE = RESERVATION.venue.countryCode;

    let SETTLEMENT_CURRENCY: CurrencyCode = OBLIGATION_CURRENCY;
    if (_venuePaymentMethodId !== undefined) {
      const METHOD = await this._venuePaymentMethodRepository.findByIdSV(
        _venuePaymentMethodId,
      );
      if (METHOD === null) {
        throw new AppError(
          'MEDIO_PAGO_NO_ENCONTRADO',
          'El medio de pago indicado no existe.',
          404,
        );
      }
      SETTLEMENT_CURRENCY = parseCurrencyCode(METHOD.settlementCurrency);
    }

    if (
      _settlementAmount !== undefined
      && _settlementAmount.currencyCode !== SETTLEMENT_CURRENCY
    ) {
      throw new AppError(
        'MONEDA_INCOMPATIBLE',
        'settlementAmount.currencyCode no coincide con el medio de pago.',
        422,
      );
    }

    const SETTLEMENT_AMOUNT = _settlementAmount !== undefined
      ? MoneyAmount.fromMinor(
          _settlementAmount.currencyCode,
          _settlementAmount.amountMinor,
        )
      : MoneyAmount.fromMinor(
          SETTLEMENT_CURRENCY,
          majorToMinorSV(_tx.amountTotal.toString()),
        );
    const OBLIGATION_TOTAL_MINOR = majorToMinorSV(_tx.amountTotal.toString());

    const SETTLEMENT_RATE = await this._getRateForReservationDayUseCase.executeSV({
      countryCode: COUNTRY_CODE,
      currency: SETTLEMENT_CURRENCY,
      scheduledAt: RESERVATION.scheduledAt,
      timezone: TIMEZONE,
    });

    let OBLIGATION_RATE = SETTLEMENT_RATE;
    if (OBLIGATION_CURRENCY !== SETTLEMENT_CURRENCY) {
      OBLIGATION_RATE = await this._getRateForReservationDayUseCase.executeSV({
        countryCode: COUNTRY_CODE,
        currency: OBLIGATION_CURRENCY,
        scheduledAt: RESERVATION.scheduledAt,
        timezone: TIMEZONE,
      });
    }

    const APPLIED_UNCAPPED = this._moneyConversionService.convertSettlementToObligationSV(
      SETTLEMENT_AMOUNT,
      OBLIGATION_CURRENCY,
      SETTLEMENT_RATE,
      OBLIGATION_CURRENCY === SETTLEMENT_CURRENCY
        ? SETTLEMENT_RATE
        : OBLIGATION_RATE,
    );

    let APPLIED_MINOR = APPLIED_UNCAPPED.amountMinor;
    if (RESERVATION.totalAmountMinor !== null) {
      const PENDING = RESERVATION.totalAmountMinor - RESERVATION.paidAmountMinor;
      if (PENDING > 0n && APPLIED_MINOR > PENDING) {
        APPLIED_MINOR = PENDING;
      }
    }

    const APPLIED = MoneyAmount.fromMinor(OBLIGATION_CURRENCY, APPLIED_MINOR);
    const AMOUNT_BS_MINOR = OBLIGATION_CURRENCY === 'BS'
      ? APPLIED_MINOR
      : this._moneyConversionService.toBsMinorSV(APPLIED, OBLIGATION_RATE);

    let CONVERSION: McpConfirmPayload['conversionRecord'];
    if (SETTLEMENT_CURRENCY !== OBLIGATION_CURRENCY) {
      const RATE_TO_BS = SETTLEMENT_CURRENCY === 'BS'
        ? '1.0000'
        : (Number(SETTLEMENT_RATE.rateBsMinorPerMajorUnit) / 100).toFixed(4);
      CONVERSION = {
        fromCurrency: SETTLEMENT_CURRENCY,
        toCurrency: OBLIGATION_CURRENCY,
        fromAmountMinor: SETTLEMENT_AMOUNT.amountMinor,
        toAmountMinor: APPLIED_MINOR,
        rateToBs: RATE_TO_BS,
        rateDate: SETTLEMENT_RATE.effectiveAt,
        exchangeRateId: SETTLEMENT_RATE.exchangeRateId || null,
        source: null,
      };
    }

    return {
      obligationCurrency: OBLIGATION_CURRENCY,
      obligationAmountMinor: majorToMinorSV(_tx.amountBase.toString()),
      feeAmountMinor: majorToMinorSV(_tx.feeAmount.toString()),
      obligationTotalMinor: OBLIGATION_TOTAL_MINOR,
      pricingCurrency: OBLIGATION_CURRENCY,
      settlementCurrency: SETTLEMENT_CURRENCY,
      settlementAmountMinor: SETTLEMENT_AMOUNT.amountMinor,
      appliedToObligationMinor: APPLIED_MINOR,
      amountBsMinor: AMOUNT_BS_MINOR,
      conversionRecord: CONVERSION,
    };
  }
}
