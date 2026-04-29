import 'dotenv/config';

import { createApp } from './app.js';
import { ENV_CONST } from './config/env.js';
import { disconnectDatabaseSV } from './infrastructure/prisma_client.js';
import { PrismaDistributedLockRepository } from './infrastructure/adapters/prisma_distributed_lock_repository.js';
import { DISPATCH_NOTIFICATIONS_UC } from './presentation/composition/notifications.composition.js';
import { startNotificationsWorkerSV } from './presentation/workers/notifications.worker.js';

const APP = createApp();

const SERVER = APP.listen(ENV_CONST.PORT, () => {
  // Mensaje simple para confirmar bootstrap local.
  console.log(`API activa en puerto ${ENV_CONST.PORT}`);
});

const LOCK_REPOSITORY = new PrismaDistributedLockRepository();
const NOTIFICATIONS_WORKER = startNotificationsWorkerSV(DISPATCH_NOTIFICATIONS_UC, LOCK_REPOSITORY);

async function shutdownSV(_signal: string): Promise<void> {
  console.log(`Cerrando API (${_signal})...`);

  NOTIFICATIONS_WORKER?.stopSV();

  await new Promise<void>((_resolve) => {
    SERVER.close(() => _resolve());
  });

  await disconnectDatabaseSV();
  console.log('API cerrada correctamente.');
}

process.on('SIGINT', () => {
  void shutdownSV('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdownSV('SIGTERM');
});
