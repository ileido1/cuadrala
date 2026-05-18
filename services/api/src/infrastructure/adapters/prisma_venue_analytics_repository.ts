import type {
  DashboardStatsDTO,
  TransactionStatsDTO,
  VenueAnalyticsRepository,
  VenueTransactionHistoryItemDTO,
  WeeklyIncomeItemDTO,
} from '../../domain/ports/venue_analytics_repository.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

const DAY_NAMES: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

export class PrismaVenueAnalyticsRepository implements VenueAnalyticsRepository {
  constructor(private readonly _prisma: PrismaClient) {}

  async getDashboardStatsSV(_venueId: string): Promise<DashboardStatsDTO> {
    const courtsCount = await this._prisma.court.count({
      where: { venueId: _venueId, status: 'ACTIVE' },
    });

    const confirmedTransactions = await this._prisma.transaction.findMany({
      where: {
        status: 'CONFIRMED',
        match: { court: { venueId: _venueId } },
      },
      select: { amountTotal: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const pendingTransactions = await this._prisma.transaction.count({
      where: {
        status: 'PENDING',
        match: { court: { venueId: _venueId } },
      },
    });

    const totalRevenue = confirmedTransactions.reduce(
      (sum, tx) => sum + Number(tx.amountTotal),
      0,
    );

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekTxs = confirmedTransactions.filter(
      (tx) => tx.createdAt >= oneWeekAgo,
    );
    const lastWeekTxs = confirmedTransactions.filter(
      (tx) => tx.createdAt >= twoWeeksAgo && tx.createdAt < oneWeekAgo,
    );

    const thisWeekRevenue = thisWeekTxs.reduce(
      (sum, tx) => sum + Number(tx.amountTotal),
      0,
    );
    const lastWeekRevenue = lastWeekTxs.reduce(
      (sum, tx) => sum + Number(tx.amountTotal),
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
        match: { court: { venueId: _venueId } },
        createdAt: { gte: startOfWeek },
      },
      select: {
        amountTotal: true,
        paymentMethod: true,
        createdAt: true,
      },
    });

    const pendingTxs = await this._prisma.transaction.count({
      where: {
        status: 'PENDING',
        match: { court: { venueId: _venueId } },
      },
    });

    const weeklyRevenue = confirmedTxs.reduce(
      (sum, tx) => sum + Number(tx.amountTotal),
      0,
    );

    const allConfirmedTxs = await this._prisma.transaction.findMany({
      where: {
        status: 'CONFIRMED',
        match: { court: { venueId: _venueId } },
      },
      select: { amountTotal: true },
    });
    const totalPaid = allConfirmedTxs.reduce(
      (sum, tx) => sum + Number(tx.amountTotal),
      0,
    );

    const totalTxs = confirmedTxs.length + pendingTxs;
    const successRate =
      totalTxs > 0 ? Math.round((confirmedTxs.length / totalTxs) * 100) : 0;

    const incomeByDay = new Map<number, number>();
    for (const tx of confirmedTxs) {
      const dayOfWeek = tx.createdAt.getDay();
      incomeByDay.set(
        dayOfWeek,
        (incomeByDay.get(dayOfWeek) ?? 0) + Number(tx.amountTotal),
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

    const [TOTAL, ROWS] = await this._prisma.$transaction([
      this._prisma.transaction.count({
        where: { match: { court: { venueId: _venueId } } },
      }),
      this._prisma.transaction.findMany({
        where: { match: { court: { venueId: _venueId } } },
        include: {
          user: { select: { name: true } },
          match: {
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

    const items = ROWS.map((tx) => ({
      id: tx.id,
      date: tx.createdAt.toISOString().split('T')[0] ?? '',
      clientName: `${tx.user.name.split(' ')[0] ?? ''}.`,
      courtName: tx.match.court?.name ?? 'N/A',
      amount: Number(tx.amountTotal),
      status: tx.status,
    }));

    return { items, total: TOTAL };
  }
}
