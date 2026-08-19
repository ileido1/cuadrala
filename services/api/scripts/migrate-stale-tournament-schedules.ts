/**
 * Migración de datos: convierte los tokens de participante persistidos en
 * `TournamentSchedule.payload` de `userId` a `TournamentRegistration.id`.
 *
 * Contexto (Slice 1: tournament-guest-registration): antes de este cambio, el
 * calendario referenciaba jugadores por `userId`. Las inscripciones GUEST no
 * tienen `userId`, así que desde ahora el calendario referencia inscripciones
 * (`TournamentRegistration.id`). Cualquier `TournamentSchedule` generado antes
 * de este cambio queda con tokens `userId` obsoletos, que la materialización
 * rechaza con 409 `CALENDARIO_OBSOLETO` (ver
 * `materialize_tournament_matches.use_case.ts`).
 *
 * Este script convierte esos schedules "in place" para no forzar una
 * regeneración manual: recorre recursivamente cada `payload` y reemplaza
 * cualquier string que coincida con un `userId` conocido del torneo por el
 * `TournamentRegistration.id` correspondiente. Es agnóstico al formato
 * (AMERICANO / ROUND_ROBIN / SINGLE_ELIMINATION) porque no necesita conocer
 * la forma exacta del payload — solo sustituye tokens string hoja a hoja.
 *
 * Idempotente: si un payload ya usa tokens `registrationId` (no coinciden con
 * ningún `userId` del torneo), el árbol resultante es idéntico y la fila no
 * se reescribe. Si un torneo desapareció o su roster cambió de forma que un
 * token ya no resuelve, el schedule queda igual y el guard 409
 * `CALENDARIO_OBSOLETO` en tiempo de materialización sigue siendo la red de
 * seguridad final (fallback documentado en Design §Migration / Rollout).
 *
 * Uso: npm run migrate:stale-tournament-schedules -- [--dry-run]
 */
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { PrismaClient } from '../src/generated/prisma/client.js';
import { remapScheduleTokensSV } from '../src/domain/tournament/tournament_schedule_token_migration.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (DATABASE_URL === undefined || DATABASE_URL === '') {
  throw new Error('DATABASE_URL es obligatoria.');
}

const POOL = new Pool({ connectionString: DATABASE_URL });
const PRISMA = new PrismaClient({ adapter: new PrismaPg(POOL) });

const DRY_RUN = process.argv.includes('--dry-run');

async function migrateStaleTournamentSchedulesSV(): Promise<{
  migrated: number;
  skipped: number;
  total: number;
}> {
  //? 1. Load all schedules and rosters in one batch to avoid N+1.
  const SCHEDULES = await PRISMA.tournamentSchedule.findMany();
  const ALL_REGISTRATIONS = await PRISMA.tournamentRegistration.findMany({
    select: { id: true, userId: true, tournamentId: true },
  });

  //? Group registrations by tournamentId for fast lookup.
  const REGISTRATIONS_BY_TOURNAMENT = new Map<string, typeof ALL_REGISTRATIONS>();
  for (const REG of ALL_REGISTRATIONS) {
    if (!REGISTRATIONS_BY_TOURNAMENT.has(REG.tournamentId)) {
      REGISTRATIONS_BY_TOURNAMENT.set(REG.tournamentId, []);
    }
    REGISTRATIONS_BY_TOURNAMENT.get(REG.tournamentId)!.push(REG);
  }

  let migrated = 0;
  let skipped = 0;

  for (const SCHEDULE of SCHEDULES) {
    //? 2. Only AUTHENTICATED registrations existed before Slice 1, so only they
    //? could have provided `userId` tokens to a legacy schedule.
    const REGISTRATIONS = REGISTRATIONS_BY_TOURNAMENT.get(SCHEDULE.tournamentId) ?? [];
    const TOKEN_MAP = new Map<string, string>();
    for (const REGISTRATION of REGISTRATIONS) {
      if (REGISTRATION.userId !== null) {
        TOKEN_MAP.set(REGISTRATION.userId, REGISTRATION.id);
      }
    }

    const MIGRATED_PAYLOAD = remapScheduleTokensSV(SCHEDULE.payload, TOKEN_MAP);

    //? 3. No reescribir si el payload no cambió (ya usa registrationId, o no hay
    //? tokens conocidos para convertir) — mantiene la migración idempotente.
    if (JSON.stringify(MIGRATED_PAYLOAD) === JSON.stringify(SCHEDULE.payload)) {
      skipped += 1;
      continue;
    }

    console.log(
      `[migrate-stale-schedules] tournamentId=${SCHEDULE.tournamentId} scheduleId=${SCHEDULE.id}: ${TOKEN_MAP.size} tokens userId -> registrationId${DRY_RUN ? ' (dry-run)' : ''}`,
    );

    if (!DRY_RUN) {
      await PRISMA.tournamentSchedule.update({
        where: { id: SCHEDULE.id },
        data: { payload: MIGRATED_PAYLOAD as never },
      });
    }
    migrated += 1;
  }

  console.log(
    `[migrate-stale-schedules] Completado${DRY_RUN ? ' (dry-run, sin escritura)' : ''}. Migrados: ${migrated}, sin cambios: ${skipped}, total: ${SCHEDULES.length}`,
  );
  return { migrated, skipped, total: SCHEDULES.length };
}

migrateStaleTournamentSchedulesSV()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await PRISMA.$disconnect();
    await POOL.end();
  });
