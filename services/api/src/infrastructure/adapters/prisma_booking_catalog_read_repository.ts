import { AppError } from '../../domain/errors/app_error.js';
import type { BookingCatalogReadRepository } from '../../domain/ports/booking_catalog_read_repository.js';
import { PRISMA } from '../prisma_client.js';

export class PrismaBookingCatalogReadRepository implements BookingCatalogReadRepository {
  async resolveSportIdForCourtSV(_courtId: string): Promise<string> {
    const COURT = await PRISMA.court.findUnique({
      where: { id: _courtId },
      select: { sportType: true },
    });
    if (COURT === null) {
      throw new AppError('CANCHA_NO_ENCONTRADA', 'La cancha no existe.', 404);
    }

    const SPORT = await PRISMA.sport.findFirst({
      where: { code: COURT.sportType },
      select: { id: true },
    });
    if (SPORT === null) {
      throw new AppError('ERROR_INTERNO', 'No se encontró el deporte de la cancha.', 500);
    }

    return SPORT.id;
  }

  async resolveDefaultCategoryIdSV(): Promise<string> {
    const CATEGORY = await PRISMA.category.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (CATEGORY === null) {
      throw new AppError('ERROR_INTERNO', 'No se encontró una categoría en el sistema.', 500);
    }
    return CATEGORY.id;
  }
}
