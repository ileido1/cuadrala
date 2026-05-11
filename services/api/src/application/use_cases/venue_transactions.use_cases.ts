/**
 * Use Case para estadísticas de transacciones de sede.
 *
 * GET /api/v1/venues/:venueId/transactions/stats
 */

import { PRISMA } from '../../infrastructure/prisma_client.js';

export interface WeeklyIncomeItemDTO {
  day: string;
  amount: number;
}

export interface PaymentMethodStatsDTO {
  method: string;
  percentage: number;
}

export interface TransactionStatsDTO {
  weeklyRevenue: number;          // centavos
  totalPaid: number;              // centavos
  successRate: number;            // porcentaje
  weeklyIncome: WeeklyIncomeItemDTO[];
  paymentMethods: PaymentMethodStatsDTO[];
}

const DAY_NAMES: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

export class GetTransactionStatsUseCase {
  async executeSV(_venueId: string): Promise<TransactionStatsDTO> {
    // Semana actual
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Transacciones confirmadas de la sede (última semana)
    const confirmedTxs = await PRISMA.transaction.findMany({
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

    // Transacciones pendientes
    const pendingTxs = await PRISMA.transaction.count({
      where: {
        status: 'PENDING',
        match: { court: { venueId: _venueId } },
      },
    });

    //weeklyRevenue = suma de amountTotal de esta semana
    const weeklyRevenue = confirmedTxs.reduce(
      (sum, tx) => sum + Number(tx.amountTotal),
      0,
    );

    // totalPaid = total histórico confirmado
    const allConfirmedTxs = await PRISMA.transaction.findMany({
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

    // successRate = confirmadas / (confirmadas + pendientes)
    const totalTxs = confirmedTxs.length + pendingTxs;
    const successRate =
      totalTxs > 0
        ? Math.round((confirmedTxs.length / totalTxs) * 100)
        : 0;

    // weeklyIncome: ingresos por día de la semana
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

    // paymentMethods: distribución por método de pago (solo CONFIRMED)
    // El PaymentMethod en el schema es MANUAL por ahora, pero dejamos preparado
    const methodCount = new Map<string, number>();
    for (const tx of confirmedTxs) {
      methodCount.set(
        tx.paymentMethod,
        (methodCount.get(tx.paymentMethod) ?? 0) + 1,
      );
    }

    const paymentMethods: PaymentMethodStatsDTO[] = [];
    if (methodCount.size > 0) {
      const totalMethods = confirmedTxs.length;
      for (const [method, count] of methodCount) {
        paymentMethods.push({
          method,
          percentage: Math.round((count / totalMethods) * 100),
        });
      }
    } else {
      // Default: 100% MANUAL
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
}
