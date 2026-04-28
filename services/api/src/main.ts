import 'dotenv/config';

import { createApp } from './app.js';
import { ENV_CONST } from './config/env.js';
import { disconnectDatabaseSV } from './infrastructure/prisma_client.js';

const APP = createApp();

const SERVER = APP.listen(ENV_CONST.PORT, () => {
  // Mensaje simple para confirmar bootstrap local.
  console.log(`API activa en puerto ${ENV_CONST.PORT}`);
});

async function shutdownSV(_signal: string): Promise<void> {
  console.log(`Cerrando API (${_signal})...`);

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
