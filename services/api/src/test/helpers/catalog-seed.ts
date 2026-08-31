import {
  RACKET_SPORT_CODES,
  SPORT_NAMES,
} from '../../domain/services/category/sport_classification_catalog.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';

const PRESET_DEFS: Array<{
  code: 'AMERICANO' | 'ROUND_ROBIN';
  name: string;
  defaultParameters: Prisma.InputJsonValue;
}> = [
  { code: 'AMERICANO', name: 'Americano', defaultParameters: {} },
  { code: 'ROUND_ROBIN', name: 'Todos contra todos', defaultParameters: { doubleRound: false } },
];

/**
 * @name    :ensurePresetV1SV
 * @version :1.0.0
 * @description :Crea el preset v1 si no existe. No toca el existente, para no
 * pisar `isActive`/`effectiveFrom` de una versión ya publicada.
 * @param {string} _sportId - Deporte dueño del preset
 * @param {'AMERICANO'|'ROUND_ROBIN'} _code - Código del formato
 * @param {string} _name - Nombre legible
 * @param {Prisma.InputJsonValue} _defaultParameters - Parámetros por defecto
 * @return {Promise<{id: string}>} Preset existente o recién creado
 */
async function ensurePresetV1SV(
  _sportId: string,
  _code: 'AMERICANO' | 'ROUND_ROBIN',
  _name: string,
  _defaultParameters: Prisma.InputJsonValue,
): Promise<{ id: string }> {
  const EXISTING = await PRISMA.tournamentFormatPreset.findUnique({
    where: { sportId_code_version: { sportId: _sportId, code: _code, version: 1 } },
    select: { id: true },
  });
  if (EXISTING !== null) return EXISTING;

  return PRISMA.tournamentFormatPreset.create({
    data: {
      sportId: _sportId,
      code: _code,
      version: 1,
      name: _name,
      schemaVersion: 1,
      defaultParameters: _defaultParameters,
    },
    select: { id: true },
  });
}

/**
 * @name    :ensureTestCatalogSV
 * @version :2.0.0
 * @description :Catálogo mínimo para tests: todos los deportes de
 * `RACKET_SPORT_CODES` con sus presets v1. Idempotente, así que cada test puede
 * llamarlo sin coordinarse con los demás.
 *
 * Recorre `RACKET_SPORT_CODES` en vez de repetir la lista: si se agrega un
 * deporte al catálogo del dominio, aparece acá solo, y no queda ausente en los
 * tests de integración que dependen de este helper.
 * @return {Promise<Object>} `sportIdsByCode` y `presetIdsByCode` con todos los
 * deportes, más los alias nombrados que ya usan los tests existentes
 */
export async function ensureTestCatalogSV(): Promise<{
  sportIdsByCode: Record<string, string>;
  presetIdsByCode: Record<string, { americano: string; roundRobin: string }>;
  sportPadelId: string;
  sportTennisId: string;
  sportPickleballId: string;
  presetAmericanoId: string;
  presetRoundRobinId: string;
  presetTennisAmericanoId: string;
  presetTennisRoundRobinId: string;
  presetPickleballAmericanoId: string;
  presetPickleballRoundRobinId: string;
}> {
  const SPORT_IDS_BY_CODE: Record<string, string> = {};
  const PRESET_IDS_BY_CODE: Record<string, { americano: string; roundRobin: string }> = {};

  for (const CODE of RACKET_SPORT_CODES) {
    const SPORT = await PRISMA.sport.upsert({
      where: { code: CODE },
      create: { code: CODE, name: SPORT_NAMES[CODE] ?? CODE },
      update: {},
      select: { id: true },
    });
    SPORT_IDS_BY_CODE[CODE] = SPORT.id;

    //? Indexado por código y no por posición: reordenar PRESET_DEFS no debe
    //? poder hacer que `presetAmericanoId` apunte al preset de ROUND_ROBIN.
    const CREATED = await Promise.all(
      PRESET_DEFS.map(async (_p) => ({
        code: _p.code,
        id: (await ensurePresetV1SV(SPORT.id, _p.code, _p.name, _p.defaultParameters)).id,
      })),
    );
    const BY_CODE = new Map(CREATED.map((_c) => [_c.code, _c.id]));
    PRESET_IDS_BY_CODE[CODE] = {
      americano: BY_CODE.get('AMERICANO')!,
      roundRobin: BY_CODE.get('ROUND_ROBIN')!,
    };
  }

  return {
    sportIdsByCode: SPORT_IDS_BY_CODE,
    presetIdsByCode: PRESET_IDS_BY_CODE,
    //? Alias nombrados que ya consumen los tests de integración existentes.
    sportPadelId: SPORT_IDS_BY_CODE['PADEL']!,
    sportTennisId: SPORT_IDS_BY_CODE['TENNIS']!,
    sportPickleballId: SPORT_IDS_BY_CODE['PICKLEBALL']!,
    presetAmericanoId: PRESET_IDS_BY_CODE['PADEL']!.americano,
    presetRoundRobinId: PRESET_IDS_BY_CODE['PADEL']!.roundRobin,
    presetTennisAmericanoId: PRESET_IDS_BY_CODE['TENNIS']!.americano,
    presetTennisRoundRobinId: PRESET_IDS_BY_CODE['TENNIS']!.roundRobin,
    presetPickleballAmericanoId: PRESET_IDS_BY_CODE['PICKLEBALL']!.americano,
    presetPickleballRoundRobinId: PRESET_IDS_BY_CODE['PICKLEBALL']!.roundRobin,
  };
}
