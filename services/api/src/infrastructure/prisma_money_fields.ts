import type { CurrencyCode, PrismaClient } from '../generated/prisma/client.js';

/** Fecha calendario (UTC midnight) en la zona horaria de la sede. */
export function venueCalendarDateSV(
  _at: Date,
  _timezone: string,
): Date {
  const FORMATTED = new Intl.DateTimeFormat('en-CA', {
    timeZone: _timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(_at);
  return new Date(`${FORMATTED}T00:00:00.000Z`);
}

/** Fecha calendario en America/Caracas (default sedes VE). */
export function caracasCalendarDateSV(_at: Date = new Date()): Date {
  return venueCalendarDateSV(_at, 'America/Caracas');
}

export async function loadVenuePricingCurrencySV(
  _prisma: Pick<PrismaClient, 'venue'>,
  _venueId: string,
): Promise<CurrencyCode> {
  const VENUE = await _prisma.venue.findUnique({
    where: { id: _venueId },
    select: { pricingCurrency: true },
  });
  if (VENUE === null) {
    throw new Error(`Venue not found: ${_venueId}`);
  }
  return VENUE.pricingCurrency;
}

/** Campos MCP en Reservation: pricing + dual-write *Minor. */
export function reservationMoneyCreateFieldsSV(
  _pricingCurrency: CurrencyCode,
  _totalAmountCents?: number | null,
): {
  pricingCurrency: CurrencyCode;
  paidAmountMinor: bigint;
  totalAmountMinor?: bigint;
} {
  return {
    pricingCurrency: _pricingCurrency,
    paidAmountMinor: 0n,
    ...(_totalAmountCents != null
      ? { totalAmountMinor: BigInt(_totalAmountCents) }
      : {}),
  };
}
