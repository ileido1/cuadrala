import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { OPENAPI_CONST } from '../../presentation/openapi/openapi.js';
import { UNDOCUMENTED_ROUTES } from './openapi_route_coverage.debt.js';

//? Vitest corre con el cwd en services/api. Se afirma que el directorio existe
//? para que un cambio de layout falle acá y no como "0 rutas encontradas".
const ROUTES_DIR = join(process.cwd(), 'src/presentation/routes');
const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

//? ---------------------------------------------------------------------------
//? Rutas reales, leidas del fuente de los routers
//? ---------------------------------------------------------------------------

/**
 * @name    :readMountPrefixesSV
 * @version :1.0.0
 * @description :Mapea cada router al prefijo con el que se monta en la v1. Se
 * lee del fuente en vez de hardcodearse, para que agregar un montaje con
 * prefijo no requiera tocar este test.
 * @return {Map<string, string>} Nombre de la constante del router → prefijo
 */
function readMountPrefixesSV(): Map<string, string> {
  const SOURCE = readFileSync(join(ROUTES_DIR, 'api.v1.router.ts'), 'utf8');
  const PREFIXES = new Map<string, string>();

  for (const MATCH of SOURCE.matchAll(/API_V1_ROUTER\.use\(\s*(?:'([^']*)'\s*,\s*)?(\w+)\s*\)/g)) {
    PREFIXES.set(MATCH[2] as string, MATCH[1] ?? '');
  }

  return PREFIXES;
}

/**
 * @name    :readRegisteredRoutesSV
 * @version :1.0.0
 * @description :Extrae METODO + path de cada ruta declarada en los routers,
 * ya con el prefijo de montaje aplicado.
 * @return {Set<string>} Entradas con forma "GET /venues/:venueId"
 */
function readRegisteredRoutesSV(): Set<string> {
  const PREFIXES = readMountPrefixesSV();
  const ROUTES = new Set<string>();

  for (const FILE of readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.router.ts'))) {
    const SOURCE = readFileSync(join(ROUTES_DIR, FILE), 'utf8');
    const PATTERN = new RegExp(`([A-Z_]+ROUTER)\\.(${METHODS.join('|')})\\(\\s*'([^']+)'`, 'g');

    for (const MATCH of SOURCE.matchAll(PATTERN)) {
      const [, ROUTER_NAME, METHOD, PATH] = MATCH as unknown as [string, string, string, string];
      if (ROUTER_NAME === 'API_V1_ROUTER') continue;

      //? En el fuente el escape se escribe '\\:'; Express 5 lo registra como
      //? dos puntos literales (verificado corriendo la ruta).
      const FULL = `${PREFIXES.get(ROUTER_NAME) ?? ''}${PATH}`.replace(/\\{1,2}:/g, ':');
      ROUTES.add(`${METHOD.toUpperCase()} ${FULL}`);
    }
  }

  return ROUTES;
}

/**
 * @name    :countLiveRoutesSV
 * @version :1.0.0
 * @description :Cuenta las rutas que Express registro de verdad al construir la
 * app. No da los paths completos —Express 5 no expone el prefijo de montaje en
 * la capa— pero sirve de contraste: si el parseo del fuente se pierde una ruta,
 * los dos numeros dejan de coincidir.
 * @return {number} Cantidad de operaciones registradas
 */
function countLiveRoutesSV(): number {
  const APP = createApp() as unknown as Record<string, { stack?: unknown[] }>;
  const ROOT = APP['router'] ?? APP['_router'];
  let total = 0;

  const walk = (stack: unknown[]): void => {
    for (const LAYER of stack as Array<Record<string, never>>) {
      const ROUTE = LAYER['route'] as { methods?: Record<string, boolean> } | undefined;
      if (ROUTE?.methods) {
        total += Object.keys(ROUTE.methods).filter((m) =>
          (METHODS as readonly string[]).includes(m),
        ).length;
        continue;
      }
      const NESTED = (LAYER['handle'] as { stack?: unknown[] } | undefined)?.stack;
      if (NESTED) walk(NESTED);
    }
  };

  walk(ROOT?.stack ?? []);
  return total;
}

//? ---------------------------------------------------------------------------
//? Operaciones documentadas en el OpenAPI
//? ---------------------------------------------------------------------------

/**
 * @name    :readDocumentedOperationsSV
 * @version :1.0.0
 * @description :Lee las operaciones del spec y las normaliza al mismo formato
 * que los routers: sin el prefijo /api/v1 y con ':param' en vez de '{param}'.
 * @return {Set<string>} Entradas con forma "GET /venues/:venueId"
 */
function readDocumentedOperationsSV(): Set<string> {
  const OPERATIONS = new Set<string>();
  const PATHS = OPENAPI_CONST.paths as Record<string, Record<string, unknown>>;

  for (const [RAW_PATH, ITEM] of Object.entries(PATHS)) {
    const PATH = RAW_PATH.replace(/^\/api\/v1/, '').replace(/\{(\w+)\}/g, ':$1');
    for (const METHOD of METHODS) {
      if (ITEM[METHOD] !== undefined) OPERATIONS.add(`${METHOD.toUpperCase()} ${PATH}`);
    }
  }

  return OPERATIONS;
}

//? ---------------------------------------------------------------------------
//? Tests
//? ---------------------------------------------------------------------------

const REGISTERED = readRegisteredRoutesSV();
const DOCUMENTED = readDocumentedOperationsSV();
const DEBT = new Set(UNDOCUMENTED_ROUTES);

describe('OpenAPI route coverage', () => {
  it('should find the routers directory', () => {
    expect(existsSync(ROUTES_DIR), `No existe ${ROUTES_DIR}`).toBe(true);
    expect(REGISTERED.size).toBeGreaterThan(0);
  });

  it('should parse every route Express actually registered', () => {
    //? Guarda contra un parseo silenciosamente incompleto: si alguien declara
    //? una ruta de una forma que el regex no ve, este numero la delata.
    expect(REGISTERED.size).toBe(countLiveRoutesSV());
  });

  it('should document every route that is not on the debt list', () => {
    const MISSING = [...REGISTERED].filter((r) => !DOCUMENTED.has(r) && !DEBT.has(r)).sort();

    expect(
      MISSING,
      `Ruta nueva sin documentar en openapi.ts. Documentala, o agregala a ` +
        `openapi_route_coverage.debt.ts si de verdad va a esperar.`,
    ).toEqual([]);
  });

  it('should not document routes that no longer exist', () => {
    const GHOSTS = [...DOCUMENTED].filter((op) => !REGISTERED.has(op)).sort();

    expect(GHOSTS, 'El spec documenta operaciones que ya no existen en ningun router.').toEqual([]);
  });

  it('should keep the debt list free of routes that are already documented', () => {
    //? Evita que la lista de deuda se vuelva mentira: en cuanto una ruta se
    //? documenta, tiene que salir de ahi.
    const STALE = [...DEBT].filter((r) => DOCUMENTED.has(r)).sort();

    expect(STALE, 'Estas ya estan documentadas: sacalas de la lista de deuda.').toEqual([]);
  });

  it('should keep the debt list free of routes that no longer exist', () => {
    const GONE = [...DEBT].filter((r) => !REGISTERED.has(r)).sort();

    expect(GONE, 'Estas rutas ya no existen: sacalas de la lista de deuda.').toEqual([]);
  });
});
