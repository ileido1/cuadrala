import 'dotenv/config';

import { disconnectDatabaseSV } from './infrastructure/prisma_client.js';
import { PrismaDistributedLockRepository } from './infrastructure/adapters/prisma_distributed_lock_repository.js';
import { DISPATCH_NOTIFICATIONS_UC } from './presentation/composition/notifications.composition.js';
import { startNotificationsWorkerSV } from './presentation/workers/notifications.worker.js';

const LOCK_REPOSITORY = new PrismaDistributedLockRepository();
const WORKER = startNotificationsWorkerSV(DISPATCH_NOTIFICATIONS_UC, LOCK_REPOSITORY);

if (WORKER === null) {
  console.log('Worker de notificaciones no iniciado (ver env).');
}

async function shutdownSV(_signal: string): Promise<void> {
  console.log(`Cerrando worker de notificaciones (${_signal})...`);
  WORKER?.stopSV();
  await disconnectDatabaseSV();
  console.log('Worker cerrado correctamente.');
}

process.on('SIGINT', () => {
  void shutdownSV('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdownSV('SIGTERM');
});

