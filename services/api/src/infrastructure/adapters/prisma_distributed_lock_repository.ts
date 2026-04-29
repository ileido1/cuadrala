import type { DistributedLockRepository } from '../../domain/ports/distributed_lock_repository.js';
import { PRISMA } from '../prisma_client.js';

type TryLockRowDTO = { locked: boolean };

export class PrismaDistributedLockRepository implements DistributedLockRepository {
  async tryAcquireSV(_lockName: string): Promise<boolean> {
    const RES = await PRISMA.$queryRaw<TryLockRowDTO[]>`
      SELECT pg_try_advisory_lock(hashtext(${_lockName})) AS locked
    `;
    return RES[0]?.locked ?? false;
  }

  async releaseSV(_lockName: string): Promise<void> {
    await PRISMA.$executeRaw`
      SELECT pg_advisory_unlock(hashtext(${_lockName}))
    `;
  }
}

