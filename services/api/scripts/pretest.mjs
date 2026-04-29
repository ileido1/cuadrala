/* global process */
import { spawnSync } from 'node:child_process';

function runOrThrowSV(_cmd, _args, _envOverrides = {}) {
  const RES = spawnSync(_cmd, _args, {
    stdio: 'inherit',
    env: { ...process.env, ..._envOverrides },
  });

  if (RES.status !== 0) {
    process.exit(RES.status ?? 1);
  }
}

runOrThrowSV('npx', ['prisma', 'generate']);

if (process.env.TEST_DATABASE_URL !== undefined && process.env.TEST_DATABASE_URL !== '') {
  runOrThrowSV(
    'npx',
    ['prisma', 'migrate', 'deploy'],
    { DATABASE_URL: process.env.TEST_DATABASE_URL },
  );
}

