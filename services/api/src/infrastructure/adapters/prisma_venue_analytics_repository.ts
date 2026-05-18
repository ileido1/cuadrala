import type {
  DashboardStatsDTO,
  TransactionStatsDTO,
  VenueAnalyticsRepository,
  VenueTransactionHistoryItemDTO,
  WeeklyIncomeItemDTO,
} from '../../domain/ports/venue_analytics_repository.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

const DAY_NAMES: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

/** Partidos (match) y reservas directas (reservation) de la sede. */
function venueTransactionsWhereSV(_venueId: string): Prisma.TransactionWhereInput {
  return {
    OR: [
      { match: { court: { venueId: _venueId } } },
      { reservation: { venueId: _venueId } },
    ],
  };
}

type TransactionHistoryRow = Prisma.TransactionGetPayload<{
  include: {
    user: { select: { name: true } };
    match: { include: { court: { select: { name: true } } } };
    reservation: { include: { court: { select: { name: true } } } };
  };
}>;

/** Monto en unidades mayores para agregados (prioriza obligación aplicada). */
function transactionAmountMajorSV(_tx: {
  amountTotal: { toString(): string } | number;
  appliedToObligationMinor: bigint | null;
}): number {
  if (_tx.appliedToObligationMinor != null) {
    return Number(_tx.appliedToObligationMinor) / 100;
  }
  return Number(_tx.amountTotal);
}

function mapTransactionHistoryItemSV(
  _tx: TransactionHistoryRow,
): VenueTransactionHistoryItemDTO {
  const DISPLAY_NAME =
    _tx.reservation?.responsibleName?.trim()
    || _tx.user.name
    || 'Cliente';
  const FIRST_NAME = DISPLAY_NAME.split(' ')[0] ?? DISPLAY_NAME;

  return {
    id: _tx.id,
    date: _tx.createdAt.toISOString().split('T')[0] ?? '',
    clientName: `${FIRST_NAME}.`,
    courtName:
      _tx.match?.court?.name
      ?? _tx.reservation?.court?.name
      ?? 'N/A',
    amount: transactionAmountMajorSV(_tx),
    status: _tx.status,
  };
}

export class PrismaVenueAnalyticsRepository implements VenueAnalyticsRepository {
  constructor(private readonly _prisma: PrismaClient) {}

  async getDashboardStatsSV(_venueId: string): Promise<DashboardStatsDTO> {
    const courtsCount = await this._prisma.court.count({
      where: { venueId: _venueId, status: 'ACTIVE' },
    });

    const confirmedTransactions = await this._prisma.transaction.findMany({
      where: {
        status: 'CONFIRMED',
        ...venueTransactionsWhereSV(_venueId),
      },
      select: {
        amountTotal: true,
        appliedToObligationMinor: true,
        confirmedAt: true,
        createdAt: true,
      },
      orderBy: { confirmedAt: 'desc' },
    });

    const pendingTransactions = await this._prisma.transaction.count({
      where: {
        status: 'PENDING',
        ...venueTransactionsWhereSV(_venueId),
      },
    });

    const totalRevenue = confirmedTransactions.reduce(
      (sum, tx) => sum + transactionAmountMajorSV(tx),

      0,
    );

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const confirmedAtOrCreated = (tx: { confirmedAt: Date | null; createdAt: Date }) =>
      tx.confirmedAt ?? tx.createdAt;

    const thisWeekTxs = confirmedTransactions.filter(
      (tx) => confirmedAtOrCreated(tx) >= oneWeekAgo,
    );
    const lastWeekTxs = confirmedTransactions.filter((tx) => {
      const AT = confirmedAtOrCreated(tx);
      return AT >= twoWeeksAgo && AT < oneWeekAgo;
    });

    const thisWeekRevenue = thisWeekTxs.reduce(
      (sum, tx) => sum + transactionAmountMajorSV(tx),
      0,
    );
    const lastWeekRevenue = lastWeekTxs.reduce(
      (sum, tx) => sum + transactionAmountMajorSV(tx),
      0,
    );

    const revenueTrend =
      lastWeekRevenue > 0
        ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 1000) / 10
        : 0;

    const totalTxsForConversion = confirmedTransactions.length + pendingTransactions;
    const conversionRate =
      totalTxsForConversion > 0
        ? Math.round((confirmedTransactions.length / totalTxsForConversion) * 100)
        : 0;

    const _thisWeekTotal = thisWeekTxs.length + pendingTransactions;
    const lastWeekTotal = lastWeekTxs.length + pendingTransactions;
    const conversionTrend =
      lastWeekTotal > 0
        ? Math.round(((thisWeekTxs.length - lastWeekTxs.length) / lastWeekTotal) * 1000) / 10
        : 0;

    const occupancyRate = `${Math.min(courtsCount, thisWeekTxs.length)}/${courtsCount}`;

    return {
      totalRevenue,
      totalCourts: courtsCount,
      occupancyRate,
      conversionRate,
      revenueTrend,
      conversionTrend,
    };
  }

  async getTransactionStatsSV(_venueId: string): Promise<TransactionStatsDTO> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const confirmedTxs = await this._prisma.transaction.findMany({
      where: {
        status: 'CONFIRMED',
        ...venueTransactionsWhereSV(_venueId),
        confirmedAt: { gte: startOfWeek },
      },
      select: {
        amountTotal: true,
        appliedToObligationMinor: true,
        paymentMethod: true,
        confirmedAt: true,
      },
    });

    const pendingTxs = await this._prisma.transaction.count({
      where: {
        status: 'PENDING',
        ...venueTransactionsWhereSV(_venueId),
      },
    });

    const weeklyRevenue = confirmedTxs.reduce(
      (sum, tx) => sum + transactionAmountMajorSV(tx),
      0,
    );

    const allConfirmedTxs = await this._prisma.transaction.findMany({
      where: {
        status: 'CONFIRMED',
        ...venueTransactionsWhereSV(_venueId),
      },
      select: { amountTotal: true, appliedToObligationMinor: true },
    });
    const totalPaid = allConfirmedTxs.reduce(
      (sum, tx) => sum + transactionAmountMajorSV(tx),
      0,
    );

    const totalTxs = allConfirmedTxs.length + pendingTxs;
    const successRate =
      totalTxs > 0
        ? Math.round((allConfirmedTxs.length / totalTxs) * 100)
        : 0;

    const incomeByDay = new Map<number, number>();
    for (const tx of confirmedTxs) {
      const confirmedAt = tx.confirmedAt ?? new Date();
      const dayOfWeek = confirmedAt.getDay();
      incomeByDay.set(
        dayOfWeek,
        (incomeByDay.get(dayOfWeek) ?? 0) + transactionAmountMajorSV(tx),
      );
    }

    const weeklyIncome: WeeklyIncomeItemDTO[] = [1, 2, 3, 4, 5, 6, 0].map((day) => ({
      day: DAY_NAMES[day] ?? '',
      amount: incomeByDay.get(day) ?? 0,
    }));

    const methodCount = new Map<string, number>();
    for (const tx of confirmedTxs) {
      methodCount.set(
        tx.paymentMethod,
        (methodCount.get(tx.paymentMethod) ?? 0) + 1,
      );
    }

    const paymentMethods: TransactionStatsDTO['paymentMethods'] = [];
    if (methodCount.size > 0) {
      const totalMethods = confirmedTxs.length;
      for (const [method, count] of methodCount) {
        paymentMethods.push({
          method,
          percentage: Math.round((count / totalMethods) * 100),
        });
      }
    } else {
      paymentMethods.push({ method: 'MANUAL', percentage: 100 });
    }

    return {
      weeklyRevenue,
      totalPaid,
      successRate,
      weeklyIncome,
      paymentMethods,
    };
  }

  async listTransactionHistorySV(
    _venueId: string,
    _page: number,
    _limit: number,
  ): Promise<{ items: VenueTransactionHistoryItemDTO[]; total: number }> {
    const SKIP = (_page - 1) * _limit;

    const VENUE_WHERE = venueTransactionsWhereSV(_venueId);

    const [TOTAL, ROWS] = await this._prisma.$transaction([
      this._prisma.transaction.count({ where: VENUE_WHERE }),
      this._prisma.transaction.findMany({
        where: VENUE_WHERE,
        include: {
          user: { select: { name: true } },
          match: {
            include: {
              court: { select: { name: true } },
            },
          },
          reservation: {
            include: {
              court: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: SKIP,
        take: _limit,
      }),
    ]);

    const items = ROWS.map((tx) => mapTransactionHistoryItemSV(tx));

    return { items, total: TOTAL };
  }
}
