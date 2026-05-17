import type { DatabaseHealthRepository } from '../../domain/ports/database_health_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaDatabaseHealthRepository implements DatabaseHealthRepository {
  async pingSV(): Promise<void> {
    await PRISMA.$queryRaw`SELECT 1`;
  }
}
