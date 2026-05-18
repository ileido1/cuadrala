'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BookingItem, PaymentMethodType, VenuePaymentMethod } from '~/types/api';
import { apiClient } from '~/lib/api-client';
import { CurrencyAmountInput } from '~/components/shared/CurrencyAmountInput';
import {
  centsToFormattedMajorInput,
  formatCentsWithCurrency,
  parseMajorAmountInput,
  resolveCurrencyCode,
  type CurrencyCode,
} from '~/lib/format-money';
import {
  convertMinorBetweenCurrenciesSV,
  localCalendarDateIsoSV,
  pickExchangeRateForDateSV,
  type ExchangeRateRow,
} from '~/lib/money-conversion';
import type { ExchangeRate } from '~/types/api';

type PaymentStep = 'summary' | 'method' | 'confirm';

interface PaymentSummary {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

interface ReservationPaymentSummaryResponse {
  totalAmount?: string;
  totalAmountCents?: number | null;
  paidAmountCents?: number;
  paymentStatus?: BookingItem['paymentStatus'];
  pendingCount: number;
  transactionCount: number;
  items?: Array<{ id: string; status: string; amountTotal?: string }>;
}

const TYPE_LABELS: Record<PaymentMethodType, string> = {
  CASH: 'Efectivo',
  BANK_TRANSFER: 'Transferencia',
  PAGO_MOVIL: 'Pago Móvil',
  POS: 'POS (Tarjeta)',
  OTHER: 'Otro',
};

function PaymentMethodTypeIcon({
  type,
  className = 'h-5 w-5',
}: {
  type: PaymentMethodType;
  className?: string;
}) {
  const stroke = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.75 };

  switch (type) {
    case 'CASH':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path {...stroke} d="M2.25 18.75a60.07 60.07 0 0115.797 0M2.25 9.75v11.25c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125V9.75M2.25 9.75h19.5M2.25 9.75l9.75-6.75 9.75 6.75" />
        </svg>
      );
    case 'BANK_TRANSFER':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path {...stroke} d="M12 21v-8.25M5.25 9.75h13.5M5.25 9.75L12 3l6.75 6.75M3.75 21h16.5" />
        </svg>
      );
    case 'PAGO_MOVIL':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path {...stroke} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18.75h6" />
        </svg>
      );
    case 'POS':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path {...stroke} d="M2.25 8.25h19.5M2.25 9h19.5v9.75a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V9zm16.5 3.75h-3m-3 0h-3" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path {...stroke} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.123.433-.123.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
      );
  }
}

const STEPS: { id: PaymentStep; label: string }[] = [
  { id: 'summary', label: 'Monto' },
  { id: 'method', label: 'Método' },
  { id: 'confirm', label: 'Confirmar' },
];

type StepDirection = 'forward' | 'back';

function StepCheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function StepAmountIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M2.25 18.75a60.07 60.07 0 0115.797 0M2.25 9.75v11.25c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125V9.75M2.25 9.75h19.5M2.25 9.75l9.75-6.75 9.75 6.75"
      />
    </svg>
  );
}

function StepMethodIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M2.25 8.25h19.5M2.25 9h19.5v9.75a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V9zm16.5 3.75h-3m-3 0h-3"
      />
    </svg>
  );
}

function StepConfirmIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function StepCircleIcon({ stepId, className = 'h-4 w-4' }: { stepId: PaymentStep; className?: string }) {
  switch (stepId) {
    case 'summary':
      return <StepAmountIcon className={className} />;
    case 'method':
      return <StepMethodIcon className={className} />;
    case 'confirm':
      return <StepConfirmIcon className={className} />;
  }
}

function buildPaymentSummaryFromReservation(
  _reservation: BookingItem,
): PaymentSummary {
  const total = _reservation.totalAmountCents ?? 0;
  const paid = _reservation.paidAmountCents ?? 0;
  return {
    totalAmount: total,
    paidAmount: paid,
    pendingAmount: Math.max(0, total - paid),
  };
}

function parsePaymentMethodsResponse(_data: unknown): VenuePaymentMethod[] {
  if (Array.isArray(_data)) return _data as VenuePaymentMethod[];
  if (
    _data !== null
    && typeof _data === 'object'
    && Array.isArray((_data as { items?: unknown }).items)
  ) {
    return (_data as { items: VenuePaymentMethod[] }).items;
  }
  return [];
}

function resolvePaymentMethodId(
  _methods: VenuePaymentMethod[],
  _selectedId: string,
  _selectedType: string,
): string | null {
  if (_selectedId) {
    const match = _methods.find((pm) => pm.id === _selectedId);
    if (match?.id) return match.id;
  }
  if (_selectedType) {
    const ofType = _methods.filter((pm) => pm.type === _selectedType);
    if (ofType.length === 1 && ofType[0]!.id) return ofType[0]!.id;
  }
  if (_methods.length === 1 && _methods[0]!.id) return _methods[0]!.id;
  return null;
}

function resolveObligationUserId(_reservation: BookingItem): string | null {
  return _reservation.organizerUserId ?? _reservation.createdByUserId ?? null;
}

function parseAmountInputToCents(_raw: string): number | null {
  const major = parseMajorAmountInput(_raw);
  if (major === null || major <= 0) return null;
  return Math.round(major * 100);
}

interface PaymentConfirmDialogProps {
  open: boolean;
  reservation: BookingItem;
  venueId: string;
  pricingCurrency?: string | null;
  displayCurrency?: string | null;
  countryCode?: string;
  venueTimezone?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function parseExchangeRatesResponse(_data: unknown): ExchangeRate[] {
  if (Array.isArray(_data)) return _data as ExchangeRate[];
  if (
    _data !== null
    && typeof _data === 'object'
    && Array.isArray((_data as { items?: unknown }).items)
  ) {
    return (_data as { items: ExchangeRate[] }).items;
  }
  return [];
}

type FxSnapshot =
  | { kind: 'none' }
  | {
      kind: 'ready';
      settlementMinor: number;
      obligationRateToBs: number;
      settlementRateToBs: number;
      reservationDateIso: string;
      settlementCurrency: CurrencyCode;
    }
  | { kind: 'missing_rate'; message: string };

function SettlementConversionCard({
  obligationMinor,
  obligationCurrency,
  settlementMinor,
  settlementCurrency,
  obligationRateToBs,
  settlementRateToBs,
  reservationDateIso,
  loading,
  error,
}: {
  obligationMinor: number;
  obligationCurrency: CurrencyCode;
  settlementMinor: number;
  settlementCurrency: CurrencyCode;
  obligationRateToBs: number;
  settlementRateToBs: number;
  reservationDateIso: string;
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-outline bg-surface-container/40 px-4 py-3 text-sm text-muted">
        Cargando tasa de cambio…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {error}
      </div>
    );
  }

  const RATE_LABEL =
    obligationCurrency === 'BS'
      ? `1 ${settlementCurrency} = ${settlementRateToBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} Bs`
      : `1 ${obligationCurrency} = ${obligationRateToBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} Bs`;

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">
        Conversión a {settlementCurrency}
      </p>
      <p className="text-sm text-sky-900">
        <span className="text-muted">Cobro en reserva:</span>{' '}
        <strong>{formatCentsWithCurrency(obligationMinor, obligationCurrency)}</strong>
      </p>
      <p className="text-lg font-bold tabular-nums text-sky-950">
        {formatCentsWithCurrency(settlementMinor, settlementCurrency)}
      </p>
      <dl className="grid grid-cols-1 gap-1 text-xs text-sky-800/90 border-t border-sky-200/80 pt-2">
        <div className="flex justify-between gap-2">
          <dt>Tasa ({reservationDateIso})</dt>
          <dd className="font-medium text-right">{RATE_LABEL}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Día de la reserva</dt>
          <dd className="font-medium">{reservationDateIso}</dd>
        </div>
      </dl>
    </div>
  );
}

function PaymentStepper({ step }: { step: PaymentStep }) {
  const currentIndex = STEPS.findIndex((s) => s.id === step);
  const progressRatio =
    STEPS.length > 1 ? currentIndex / (STEPS.length - 1) : 0;

  return (
    <nav aria-label="Progreso del pago" className="px-1">
      <div className="relative mx-auto w-full max-w-sm px-1">
        <div
          className="pointer-events-none absolute top-5 h-0.5 rounded-full bg-gray-200"
          style={{ left: '16.666%', right: '16.666%' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-5 h-0.5 rounded-full bg-primary-500 transition-[width] duration-500 ease-out"
          style={{
            left: '16.666%',
            width: `calc(66.666% * ${progressRatio})`,
          }}
          aria-hidden
        />
        <ol className="relative z-10 grid grid-cols-3">
          {STEPS.map((s, index) => {
            const isDone = index < currentIndex;
            const isActive = index === currentIndex;
            const isUpcoming = index > currentIndex;

            return (
              <li
                key={s.id}
                className="flex flex-col items-center gap-2 text-center"
                aria-current={isActive ? 'step' : undefined}
              >
                <div
                  className={`
                    relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2
                    transition-colors duration-300 ease-out
                    ${isActive
                      ? 'border-primary-500 bg-primary-500 text-white shadow-md shadow-primary-500/30'
                      : ''}
                    ${isDone
                      ? 'border-primary-500 bg-primary-500 text-white'
                      : ''}
                    ${isUpcoming
                      ? 'border-gray-200 bg-white text-gray-500'
                      : ''}
                  `}
                >
                  <StepCircleIcon
                    stepId={s.id}
                    className={`h-[18px] w-[18px] shrink-0 ${
                      isActive || isDone ? 'text-white' : 'text-gray-500'
                    }`}
                  />
                  {isDone && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-primary-600 ring-2 ring-primary-500">
                      <StepCheckIcon className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <span
                  className={`
                    max-w-[5.5rem] text-[11px] font-semibold leading-tight tracking-wide
                    ${isActive ? 'text-primary-600' : ''}
                    ${isDone ? 'text-secondary-800' : ''}
                    ${isUpcoming ? 'text-muted' : ''}
                  `}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

function PaymentStepPanel({
  stepKey,
  direction,
  children,
}: {
  stepKey: PaymentStep;
  direction: StepDirection;
  children: ReactNode;
}) {
  return (
    <div
      key={stepKey}
      className={
        direction === 'forward'
          ? 'animate-step-forward'
          : 'animate-step-back'
      }
    >
      {children}
    </div>
  );
}


function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'default' | 'paid' | 'pending';
}) {
  const valueClass =
    accent === 'paid'
      ? 'text-emerald-700'
      : accent === 'pending'
        ? 'text-amber-700'
        : 'text-secondary-900';

  return (
    <div className="rounded-xl border border-outline bg-surface-container/50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

export function PaymentConfirmDialog({
  open,
  reservation,
  venueId,
  pricingCurrency,
  displayCurrency,
  countryCode = 'VE',
  venueTimezone = 'America/Caracas',
  onClose,
  onSuccess,
}: PaymentConfirmDialogProps) {
  const currencyCode = resolveCurrencyCode(
    reservation.pricingCurrency ?? pricingCurrency,
    displayCurrency,
  );

  const [loading, setLoading] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [stepLoading, setStepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<VenuePaymentMethod[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [selectedPaymentMethodType, setSelectedPaymentMethodType] =
    useState<PaymentMethodType | ''>('');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('summary');
  const [stepDirection, setStepDirection] = useState<StepDirection>('forward');
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(
    null,
  );
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedAmountCents, setConfirmedAmountCents] = useState<number | null>(
    null,
  );
  const [confirmedCurrency, setConfirmedCurrency] = useState<CurrencyCode | null>(
    null,
  );

  const paymentAmountCents = parseAmountInputToCents(paymentAmountInput);
  const maxPayableCents = paymentSummary?.pendingAmount ?? 0;
  const paidPercent =
    paymentSummary && paymentSummary.totalAmount > 0
      ? Math.min(100, (paymentSummary.paidAmount / paymentSummary.totalAmount) * 100)
      : 0;

  const selectedMethod = paymentMethods.find(
    (m) => m.id === selectedPaymentMethodId,
  );
  const config = selectedMethod?.config as Record<string, string> | undefined;
  const availableTypes = useMemo(
    () => [...new Set(paymentMethods.map((pm) => pm.type))],
    [paymentMethods],
  );
  const resolvedPaymentMethodId = resolvePaymentMethodId(
    paymentMethods,
    selectedPaymentMethodId,
    selectedPaymentMethodType,
  );

  const settlementCurrency = resolveCurrencyCode(
    selectedMethod?.settlementCurrency,
    currencyCode,
  );

  const reservationDateIso = useMemo(
    () => localCalendarDateIsoSV(reservation.scheduledAt, venueTimezone),
    [reservation.scheduledAt, venueTimezone],
  );

  const fxSnapshot: FxSnapshot = useMemo(() => {
    if (
      settlementCurrency === currencyCode
      || paymentAmountCents === null
      || paymentAmountCents <= 0
    ) {
      return { kind: 'none' };
    }

    const RATE_ROWS: ExchangeRateRow[] = exchangeRates.map((r) => ({
      currency: r.currency,
      rateToBs: r.rateToBs,
      effectiveDate: r.effectiveDate,
      source: r.source,
    }));

    const OBLIGATION_RATE = pickExchangeRateForDateSV(
      RATE_ROWS,
      currencyCode,
      reservationDateIso,
    );
    const SETTLEMENT_RATE = pickExchangeRateForDateSV(
      RATE_ROWS,
      settlementCurrency,
      reservationDateIso,
    );

    if (!OBLIGATION_RATE || !SETTLEMENT_RATE) {
      const MISSING =
        !OBLIGATION_RATE && currencyCode !== 'BS'
          ? currencyCode
          : settlementCurrency;
      return {
        kind: 'missing_rate',
        message: `No hay tasa de cambio para ${MISSING} en la fecha de la reserva (${reservationDateIso}). Actualizá tasas en Ajustes o el panel de administración.`,
      };
    }

    const SETTLEMENT_MINOR = convertMinorBetweenCurrenciesSV(
      paymentAmountCents,
      currencyCode,
      settlementCurrency,
      OBLIGATION_RATE.rateToBs,
      SETTLEMENT_RATE.rateToBs,
    );

    return {
      kind: 'ready',
      settlementMinor: SETTLEMENT_MINOR,
      obligationRateToBs: OBLIGATION_RATE.rateToBs,
      settlementRateToBs: SETTLEMENT_RATE.rateToBs,
      reservationDateIso,
      settlementCurrency,
    };
  }, [
    settlementCurrency,
    currencyCode,
    paymentAmountCents,
    exchangeRates,
    reservationDateIso,
  ]);

  const needsFxConversion = fxSnapshot.kind !== 'none';
  const canProceedWithFx =
    !needsFxConversion || fxSnapshot.kind === 'ready';

  const loadExchangeRates = () => {
    setRatesLoading(true);
    setRatesError(null);
    apiClient.exchangeRates
      .list(countryCode)
      .then((r) => {
        setExchangeRates(parseExchangeRatesResponse(r.data?.data));
      })
      .catch(() => {
        setRatesError('No se pudieron cargar las tasas de cambio.');
        setExchangeRates([]);
      })
      .finally(() => setRatesLoading(false));
  };

  const loadPaymentMethods = () => {
    if (!venueId) return;
    setPaymentMethodsLoading(true);
    apiClient.venues.paymentMethods
      .listAll(venueId)
      .then((r) => {
        const items = parsePaymentMethodsResponse(r.data?.data);
        setPaymentMethods(items.filter((pm) => pm.isActive !== false && Boolean(pm.id)));
      })
      .catch(() =>
        apiClient.venues.paymentMethods.list(venueId).then((r) => {
          const items = parsePaymentMethodsResponse(r.data?.data);
          setPaymentMethods(items.filter((pm) => Boolean(pm.id)));
        }),
      )
      .catch(() => setPaymentMethods([]))
      .finally(() => setPaymentMethodsLoading(false));
  };

  const fetchPaymentSummary = async () => {
    setStepLoading(true);
    const base = buildPaymentSummaryFromReservation(reservation);
    setPaymentSummary(base);
    setPaymentAmountInput(
      centsToFormattedMajorInput(base.pendingAmount, currencyCode),
    );

    try {
      const res = await apiClient.venues.reservations.transactions.getSummary(
        reservation.id,
      );
      const data = res.data.data as ReservationPaymentSummaryResponse;
      const totalCents =
        data.totalAmountCents
        ?? reservation.totalAmountCents
        ?? base.totalAmount;
      const paidCents =
        data.paidAmountCents
        ?? reservation.paidAmountCents
        ?? base.paidAmount;

      if (totalCents > 0) {
        const summary: PaymentSummary = {
          totalAmount: totalCents,
          paidAmount: paidCents,
          pendingAmount: Math.max(0, totalCents - paidCents),
        };
        setPaymentSummary(summary);
        setPaymentAmountInput(
          centsToFormattedMajorInput(summary.pendingAmount, currencyCode),
        );
      }
    } catch {
      /* mantener totales de la reserva */
    } finally {
      setStepLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setPaymentStep('summary');
    setStepDirection('forward');
    setSelectedPaymentMethodType('');
    setSelectedPaymentMethodId('');
    setPaymentReference('');
    setError(null);
    setConfirmed(false);
    loadPaymentMethods();
    loadExchangeRates();
    fetchPaymentSummary();
  }, [open, reservation.id, countryCode]);

  useEffect(() => {
    if (paymentStep !== 'method' || paymentMethods.length === 0) return;
    if (paymentMethods.length === 1) {
      const only = paymentMethods[0]!;
      setSelectedPaymentMethodType(only.type);
      setSelectedPaymentMethodId(only.id);
      return;
    }
    if (selectedPaymentMethodType) {
      const ofType = paymentMethods.filter(
        (pm) => pm.type === selectedPaymentMethodType,
      );
      if (ofType.length === 1) setSelectedPaymentMethodId(ofType[0]!.id);
    }
  }, [paymentStep, paymentMethods, selectedPaymentMethodType]);

  if (!open) return null;

  const handleClose = () => {
    onClose();
    setPaymentStep('summary');
    setError(null);
  };

  const handlePayFullPending = () => {
    if (!paymentSummary) return;
    setPaymentAmountInput(
      centsToFormattedMajorInput(paymentSummary.pendingAmount, currencyCode),
    );
    setError(null);
  };

  const handleNext = () => {
    if (paymentAmountCents === null) {
      setError('Ingresá un monto válido mayor a cero.');
      return;
    }
    if (paymentAmountCents > maxPayableCents) {
      setError(
        `El monto no puede superar ${formatCentsWithCurrency(maxPayableCents, currencyCode)}.`,
      );
      return;
    }
    setError(null);
    setStepDirection('forward');
    setPaymentStep('method');
  };

  const handleMethodContinue = () => {
    if (!resolvedPaymentMethodId) {
      setError('Seleccioná un medio de pago.');
      return;
    }
    if (fxSnapshot.kind === 'missing_rate') {
      setError(fxSnapshot.message);
      return;
    }
    setSelectedPaymentMethodId(resolvedPaymentMethodId);
    setError(null);
    setStepDirection('forward');
    setPaymentStep('confirm');
  };

  const handleBack = () => {
    setError(null);
    setStepDirection('back');
    if (paymentStep === 'method') setPaymentStep('summary');
    else if (paymentStep === 'confirm') setPaymentStep('method');
  };

  const handleSubmit = async () => {
    const methodId = resolvedPaymentMethodId;
    if (!methodId || paymentAmountCents === null) {
      setError('Completá monto y medio de pago.');
      return;
    }
    if (paymentAmountCents > maxPayableCents) {
      setError(
        `El monto no puede superar ${formatCentsWithCurrency(maxPayableCents, currencyCode)}.`,
      );
      return;
    }
    if (fxSnapshot.kind === 'missing_rate') {
      setError(fxSnapshot.message);
      return;
    }

    const settlementMinor =
      fxSnapshot.kind === 'ready'
        ? fxSnapshot.settlementMinor
        : paymentAmountCents;

    setLoading(true);
    setError(null);
    try {
      const method = paymentMethods.find((m) => m.id === methodId);
      let transactionId: string | null = null;

      const summaryRes =
        await apiClient.venues.reservations.transactions.getSummary(reservation.id);
      let summaryData = summaryRes.data.data as ReservationPaymentSummaryResponse;

      const findPending = (
        items?: ReservationPaymentSummaryResponse['items'],
      ) => items?.find((t) => t.status === 'PENDING')?.id ?? null;

      transactionId = findPending(summaryData.items);

      if (!transactionId) {
        const payerUserId = resolveObligationUserId(reservation);
        if (!payerUserId) {
          throw new Error('No se pudo determinar el usuario asociado al pago.');
        }
        const created =
          await apiClient.venues.reservations.transactions.createObligations(
            reservation.id,
            {
              amountBasePerPerson: paymentAmountCents / 100,
              participantUserIds: [payerUserId],
            },
          );
        const createdData = created.data.data as {
          created?: Array<{ id: string }>;
        };
        if (createdData.created?.length) {
          transactionId = createdData.created[0]!.id;
        } else {
          const again =
            await apiClient.venues.reservations.transactions.getSummary(
              reservation.id,
            );
          summaryData = again.data.data as ReservationPaymentSummaryResponse;
          transactionId = findPending(summaryData.items);
        }
      }

      if (!transactionId) {
        throw new Error(
          'No hay una obligación pendiente para este monto.',
        );
      }

      const methodSettlementCurrency = resolveCurrencyCode(
        method?.settlementCurrency,
        currencyCode,
      );

      await apiClient.instance.patch(
        `/transactions/${transactionId}/confirm-manual`,
        {
          venuePaymentMethodId: methodId,
          settlementAmount: {
            amountMinor: String(settlementMinor),
            currencyCode: methodSettlementCurrency,
          },
          referenceNumber: paymentReference || undefined,
          paymentData: method?.config ?? undefined,
        },
      );

      setConfirmedAmountCents(settlementMinor);
      setConfirmedCurrency(methodSettlementCurrency);
      setConfirmed(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1600);
    } catch (err: unknown) {
      let message = 'No se pudo confirmar el pago.';
      if (err instanceof Error && 'response' in err) {
        message =
          (err as { response?: { data?: { message?: string } } }).response?.data
            ?.message ?? message;
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl animate-scale-in">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 animate-fade-in">
            <svg className="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-secondary-900">Pago registrado</h2>
          <p className="mt-2 text-sm text-muted">
            {confirmedAmountCents !== null && confirmedCurrency
              ? formatCentsWithCurrency(confirmedAmountCents, confirmedCurrency)
              : ''}{' '}
            confirmado correctamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl animate-scale-in"
        role="dialog"
        aria-labelledby="payment-dialog-title"
      >
        <div className="flex items-start justify-between border-b border-outline px-5 py-4">
          <div>
            <h2 id="payment-dialog-title" className="text-lg font-bold text-secondary-900">
              Confirmar pago
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {reservation.courtName ?? 'Reserva'} ·{' '}
              {reservation.responsibleName?.trim() || 'Sin responsable'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted hover:bg-gray-100 hover:text-secondary-700"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b border-outline/60 px-5 py-4">
          <PaymentStepper step={paymentStep} />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 animate-fade-in">
              {error}
            </div>
          )}

          <div className="min-h-[18rem] overflow-x-hidden">
          <PaymentStepPanel stepKey={paymentStep} direction={stepDirection}>
          {paymentStep === 'summary' && (
            <div className="space-y-4">
              {stepLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                </div>
              ) : (
                <>
                  {paymentSummary && paymentSummary.totalAmount > 0 && (
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted">
                        <span>Cobrado</span>
                        <span>
                          {Math.round(paidPercent)}% ·{' '}
                          {formatCentsWithCurrency(paymentSummary.paidAmount, currencyCode)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${paidPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <SummaryStat
                      label="Total"
                      value={
                        paymentSummary
                          ? formatCentsWithCurrency(
                              paymentSummary.totalAmount,
                              currencyCode,
                            )
                          : '—'
                      }
                    />
                    <SummaryStat
                      label="Pagado"
                      value={
                        paymentSummary
                          ? formatCentsWithCurrency(
                              paymentSummary.paidAmount,
                              currencyCode,
                            )
                          : '—'
                      }
                      accent="paid"
                    />
                    <SummaryStat
                      label="Pendiente"
                      value={
                        paymentSummary
                          ? formatCentsWithCurrency(
                              paymentSummary.pendingAmount,
                              currencyCode,
                            )
                          : '—'
                      }
                      accent="pending"
                    />
                  </div>

                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <label
                        htmlFor="payment-amount-input"
                        className="text-sm font-semibold text-secondary-800"
                      >
                        Monto a cobrar ahora
                      </label>
                      {maxPayableCents > 0 && (
                        <button
                          type="button"
                          onClick={handlePayFullPending}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Usar saldo pendiente
                        </button>
                      )}
                    </div>
                    <CurrencyAmountInput
                      value={paymentAmountInput}
                      onChange={(v) => {
                        setPaymentAmountInput(v);
                        setError(null);
                      }}
                      currency={currencyCode}
                      inputClassName="text-2xl font-bold py-3"
                      className="w-full"
                    />
                    {paymentAmountCents !== null && maxPayableCents > 0 && (
                      <p className="mt-2 text-xs text-muted">
                        {paymentAmountCents < maxPayableCents
                          ? `Quedarán ${formatCentsWithCurrency(maxPayableCents - paymentAmountCents, currencyCode)} pendientes después de este cobro.`
                          : paymentAmountCents === maxPayableCents
                            ? 'Este cobro salda la reserva por completo.'
                            : null}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {paymentStep === 'method' && (
            <div className="space-y-4">
              {paymentMethodsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                </div>
              ) : availableTypes.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-4 text-center text-sm text-amber-900">
                  No hay medios de pago activos. Configuralos en Ajustes → Medios de pago.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted">
                    Cobrás{' '}
                    <strong className="text-secondary-900">
                      {paymentAmountCents !== null
                        ? formatCentsWithCurrency(paymentAmountCents, currencyCode)
                        : '—'}
                    </strong>
                  </p>
                  <div className="space-y-2">
                    {availableTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          const ofType = paymentMethods.filter((pm) => pm.type === type);
                          setSelectedPaymentMethodType(type);
                          setSelectedPaymentMethodId(
                            ofType.length === 1 ? ofType[0]!.id : '',
                          );
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                          selectedPaymentMethodType === type
                            ? 'border-primary bg-primary/5'
                            : 'border-outline hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow-sm ring-1 ring-outline/60">
                          <PaymentMethodTypeIcon type={type} />
                        </span>
                        <span className="font-medium text-secondary-900">
                          {TYPE_LABELS[type]}
                        </span>
                      </button>
                    ))}
                  </div>
                  {selectedPaymentMethodType && (
                    <div className="space-y-2 border-t border-outline pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Cuenta / comercio
                      </p>
                      {paymentMethods
                        .filter((pm) => pm.type === selectedPaymentMethodType)
                        .map((pm) => (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setSelectedPaymentMethodId(pm.id)}
                            className={`w-full rounded-lg border-2 px-3 py-2.5 text-left text-sm transition-all ${
                              selectedPaymentMethodId === pm.id
                                ? 'border-primary-500 bg-primary-500/5 font-medium'
                                : 'border-outline hover:bg-gray-50'
                            }`}
                          >
                            <span className="block">{pm.name}</span>
                            <span className="text-xs font-normal text-muted">
                              Liquida en{' '}
                              {resolveCurrencyCode(pm.settlementCurrency, currencyCode)}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                  {resolvedPaymentMethodId && needsFxConversion && paymentAmountCents !== null && (
                    <SettlementConversionCard
                      obligationMinor={paymentAmountCents}
                      obligationCurrency={currencyCode}
                      settlementMinor={
                        fxSnapshot.kind === 'ready' ? fxSnapshot.settlementMinor : 0
                      }
                      settlementCurrency={
                        fxSnapshot.kind === 'ready'
                          ? fxSnapshot.settlementCurrency
                          : settlementCurrency
                      }
                      obligationRateToBs={
                        fxSnapshot.kind === 'ready' ? fxSnapshot.obligationRateToBs : 0
                      }
                      settlementRateToBs={
                        fxSnapshot.kind === 'ready' ? fxSnapshot.settlementRateToBs : 0
                      }
                      reservationDateIso={reservationDateIso}
                      loading={ratesLoading}
                      error={
                        fxSnapshot.kind === 'missing_rate'
                          ? fxSnapshot.message
                          : ratesError
                      }
                    />
                  )}
                </>
              )}
            </div>
          )}

          {paymentStep === 'confirm' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-outline bg-surface-container/40 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary shadow-sm ring-1 ring-outline/60">
                    {selectedMethod && (
                      <PaymentMethodTypeIcon type={selectedMethod.type} className="h-6 w-6" />
                    )}
                  </span>
                  <div>
                    <p className="font-semibold text-secondary-900">
                      {selectedMethod?.name}
                    </p>
                    <p className="text-xs text-muted">
                      {selectedMethod && TYPE_LABELS[selectedMethod.type]}
                    </p>
                  </div>
                </div>
                {config && selectedMethod?.type === 'BANK_TRANSFER' && (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs border-t border-outline pt-3">
                    {config.bank && (
                      <>
                        <dt className="text-muted">Banco</dt>
                        <dd className="font-medium">{config.bank}</dd>
                      </>
                    )}
                    {config.accountNumber && (
                      <>
                        <dt className="text-muted">Cuenta</dt>
                        <dd className="font-medium">{config.accountNumber}</dd>
                      </>
                    )}
                  </dl>
                )}
                {config && selectedMethod?.type === 'PAGO_MOVIL' && (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs border-t border-outline pt-3">
                    {config.bank && (
                      <>
                        <dt className="text-muted">Banco</dt>
                        <dd className="font-medium">{config.bank}</dd>
                      </>
                    )}
                    {config.phoneNumber && (
                      <>
                        <dt className="text-muted">Teléfono</dt>
                        <dd className="font-medium">{config.phoneNumber}</dd>
                      </>
                    )}
                  </dl>
                )}
              </div>

              {fxSnapshot.kind === 'ready' && paymentAmountCents !== null && (
                <SettlementConversionCard
                  obligationMinor={paymentAmountCents}
                  obligationCurrency={currencyCode}
                  settlementMinor={fxSnapshot.settlementMinor}
                  settlementCurrency={fxSnapshot.settlementCurrency}
                  obligationRateToBs={fxSnapshot.obligationRateToBs}
                  settlementRateToBs={fxSnapshot.settlementRateToBs}
                  reservationDateIso={fxSnapshot.reservationDateIso}
                />
              )}

              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                  {fxSnapshot.kind === 'ready'
                    ? `Monto a registrar (${fxSnapshot.settlementCurrency})`
                    : 'Monto a confirmar'}
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-800">
                  {fxSnapshot.kind === 'ready'
                    ? formatCentsWithCurrency(
                        fxSnapshot.settlementMinor,
                        fxSnapshot.settlementCurrency,
                      )
                    : paymentAmountCents !== null
                      ? formatCentsWithCurrency(paymentAmountCents, currencyCode)
                      : '—'}
                </p>
                {fxSnapshot.kind === 'ready' && paymentAmountCents !== null && (
                  <p className="mt-1 text-xs text-emerald-700/80">
                    Equivale a{' '}
                    {formatCentsWithCurrency(paymentAmountCents, currencyCode)} en la
                    reserva
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="payment-reference"
                  className="mb-1 block text-sm font-medium text-secondary-700"
                >
                  Referencia <span className="font-normal text-muted">(opcional)</span>
                </label>
                <input
                  id="payment-reference"
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Nº de comprobante o referencia"
                  className="input w-full"
                />
              </div>
            </div>
          )}
          </PaymentStepPanel>
          </div>
        </div>

        <div className="flex gap-2 border-t border-outline bg-gray-50/80 px-5 py-4">
          {paymentStep !== 'summary' && (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="btn btn-secondary flex-1"
            >
              Atrás
            </button>
          )}
          {paymentStep === 'summary' && (
            <button
              type="button"
              onClick={handleNext}
              disabled={
                stepLoading
                || paymentAmountCents === null
                || paymentAmountCents <= 0
                || maxPayableCents <= 0
              }
              className="btn btn-primary flex-[2]"
            >
              Continuar
            </button>
          )}
          {paymentStep === 'method' && (
            <button
              type="button"
              onClick={handleMethodContinue}
              disabled={
                paymentMethodsLoading
                || !resolvedPaymentMethodId
                || !canProceedWithFx
              }
              className="btn btn-primary flex-[2]"
            >
              Continuar
            </button>
          )}
          {paymentStep === 'confirm' && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !resolvedPaymentMethodId || !canProceedWithFx}
              className="btn btn-primary flex-[2]"
            >
              {loading ? 'Confirmando…' : 'Confirmar pago'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
