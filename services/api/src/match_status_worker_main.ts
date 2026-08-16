import 'dotenv/config';

import { disconnectDatabaseSV } from './infrastructure/prisma_client.js';
import { PrismaDistributedLockRepository } from './infrastructure/adapters/prisma_distributed_lock_repository.js';
import { PrismaMatchStatusRepository } from './infrastructure/adapters/prisma_match_status_repository.js';
import { UpdateMatchStatusUseCase } from './application/use_cases/update_match_status.use_case.js';
import { startMatchStatusWorkerSV } from './presentation/workers/match_status.worker.js';

const LOCK_REPOSITORY = new PrismaDistributedLockRepository();
const MATCH_STATUS_REPOSITORY = new PrismaMatchStatusRepository();
const UPDATE_MATCH_STATUS_UC = new UpdateMatchStatusUseCase(MATCH_STATUS_REPOSITORY);
const WORKER = startMatchStatusWorkerSV(UPDATE_MATCH_STATUS_UC, LOCK_REPOSITORY);

if (WORKER === null) {
  console.log('Worker de actualización de estado de partidas no iniciado (ver env).');
}

async function shutdownSV(_signal: string): Promise<void> {
  console.log(`Cerrando worker de estado de partidas (${_signal})...`);
  WORKER?.stopSV();
  await disconnectDatabaseSV();
  console.log('Worker cerrado correctamente.');
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdownSV('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdownSV('SIGTERM');
});
