/**
 * Use Case para estadísticas del dashboard de sede.
 *
 * GET /api/v1/venues/:venueId/dashboard-stats
 */

import { PRISMA } from '../../infrastructure/prisma_client.js';

export interface DashboardStatsDTO {
  totalRevenue: number;      // centavos
  totalCourts: number;
  occupancyRate: string;     // ej. "4/5"
  conversionRate: number;    // porcentaje
  revenueTrend: number;      // % de cambio
  conversionTrend: number;   // % de cambio
}

export class GetDashboardStatsUseCase {
  async executeSV(_venueId: string): Promise<DashboardStatsDTO> {
    // Total de canchas activas de la sede
    const courtsCount = await PRISMA.court.count({
      where: { venueId: _venueId, status: 'ACTIVE' },
    });

    // Transacciones confirmadas de la sede (por ahora todas las sedes)
    // En un caso real filtraríamos por venueId a través de Match→Court
    const confirmedTransactions = await PRISMA.transaction.findMany({
      where: {
        status: 'CONFIRMED',
        match: { court: { venueId: _venueId } },
      },
      select: { amountTotal: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    // Transacciones pendientes
    const pendingTransactions = await PRISMA.transaction.count({
      where: {
        status: 'PENDING',
        match: { court: { venueId: _venueId } },
      },
    });

    // Ingresos totales (suma de amountTotal de transacciones confirmadas)
    const totalRevenue = confirmedTransactions.reduce(
      (sum, tx) => sum + Number(tx.amountTotal),
      0,
    );

    // Transacciones de la última semana vs semana anterior para tendencias
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

    // Trend de revenue (%): si lastWeekRevenue=0, mostrar 0
    const revenueTrend =
      lastWeekRevenue > 0
        ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 1000) / 10
        : 0;

    // Transacciones confirmadas de la última semana vs totales pendientes+confirmadas
    const totalTxsForConversion = confirmedTransactions.length + pendingTransactions;
    const conversionRate =
      totalTxsForConversion > 0
        ? Math.round((confirmedTransactions.length / totalTxsForConversion) * 100)
        : 0;

    // Trend de conversión (simplificado: comparación semanal)
    const thisWeekTotal = thisWeekTxs.length + pendingTransactions;
    const lastWeekTotal = lastWeekTxs.length + pendingTransactions;
    const conversionTrend =
      lastWeekTotal > 0
        ? Math.round(((thisWeekTxs.length - lastWeekTxs.length) / lastWeekTotal) * 1000) / 10
        : 0;

    // Occupancy rate: fija (por ahora returned como "X/Y")
    // En producción sería: partidos agendados / horas disponibles
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
}
