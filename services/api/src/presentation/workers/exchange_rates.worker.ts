import type { RefreshExchangeRatesUseCase } from '../../application/use_cases/refresh_exchange_rates.use_case.js';
import { ENV_CONST } from '../../config/env.js';
import type { DistributedLockRepository } from '../../domain/ports/distributed_lock_repository.js';

export type ExchangeRatesWorkerHandle = { stopSV: () => void };

const LOCK_KEY = 'exchange_rates_refresh_worker';

/**
 * Trae las tasas de cambio del proveedor externo y las persiste.
 *
 * Sin este worker el refresh solo existía como un POST manual que nadie
 * llamaba: las tasas quedaban congeladas en los valores que dejó el seed.
 */
export function startExchangeRatesWorkerSV(
  _refreshExchangeRatesUC: RefreshExchangeRatesUseCase,
  _distributedLockRepository: DistributedLockRepository | null = null,
): ExchangeRatesWorkerHandle | null {
  //? 1. Verificar si debe ejecutarse (saltar en tests, verificar feature flag)
  if (ENV_CONST.NODE_ENV === 'test') {
    return null;
  }

  if (!ENV_CONST.EXCHANGE_RATES_WORKER_ENABLED) {
    console.log(
      '[worker] Exchange rates worker no activado (ver env EXCHANGE_RATES_WORKER_ENABLED).',
    );
    return null;
  }

  //? 2. Configurar intervalo, timeout y país
  const INTERVAL_MS = ENV_CONST.EXCHANGE_RATES_WORKER_INTERVAL_MS;
  const TICK_TIMEOUT_MS = ENV_CONST.EXCHANGE_RATES_WORKER_TICK_TIMEOUT_MS;
  const COUNTRY_CODE = ENV_CONST.EXCHANGE_RATES_WORKER_COUNTRY_CODE;

  let isRunning = false;

  //? 3. Definir función tick (refresca las tasas del país configurado)
  const tickSV = async (): Promise<void> => {
    if (isRunning) {
      console.log('[worker] Exchange rates: tick anterior aún en progreso, saltando...');
      return;
    }

    isRunning = true;
    const TICK_STARTED_AT = Date.now();
    let lockAcquired = false;

    try {
      if (_distributedLockRepository !== null) {
        lockAcquired = await _distributedLockRepository.tryAcquireSV(LOCK_KEY);
        if (!lockAcquired) {
          console.log('[worker] Exchange rates: no adquirió lock (otra instancia ejecutando).');
          return;
        }
      }

      const RES = await Promise.race([
        _refreshExchangeRatesUC.executeSV(COUNTRY_CODE),
        new Promise<never>(
          (_resolve, _reject) =>
            setTimeout(() => _reject(new Error('tick_timeout')), TICK_TIMEOUT_MS),
        ),
      ]);

      console.log(
        JSON.stringify({
          kind: 'exchange_rates.refresh.tick',
          status: 'SUCCESS',
          countryCode: COUNTRY_CODE,
          updatedCount: RES.items.length,
          elapsedMs: Date.now() - TICK_STARTED_AT,
        }),
      );
    } catch (_error) {
      //? El proveedor es externo: se cae, cambia de formato o tarda. Un tick
      //? fallido se registra y se sigue — matar el worker dejaría las tasas
      //? congeladas hasta el próximo deploy, que es el bug que vino a arreglar.
      const IS_TIMEOUT = _error instanceof Error && _error.message === 'tick_timeout';

      console.log(
        JSON.stringify({
          kind: 'exchange_rates.refresh.tick',
          status: 'FAILED',
          countryCode: COUNTRY_CODE,
          elapsedMs: Date.now() - TICK_STARTED_AT,
          errorCode: IS_TIMEOUT ? 'tick_timeout' : 'tick_failed',
          errorMessage: _error instanceof Error ? _error.message : String(_error),
        }),
      );
    } finally {
      if (_distributedLockRepository !== null && lockAcquired) {
        try {
          await _distributedLockRepository.releaseSV(LOCK_KEY);
        } catch {
          // best-effort
        }
      }
      isRunning = false;
    }
  };

  //? 4. Ejecutar tick una vez al iniciar
  void tickSV();

  //? 5. Configurar ejecución periódica
  const intervalId = setInterval(() => {
    void tickSV();
  }, INTERVAL_MS);

  //? 6. Retornar handle para detener el worker
  const stopSV = (): void => {
    clearInterval(intervalId);
  };

  console.log(
    `[worker] Exchange rates worker iniciado (país: ${COUNTRY_CODE}, intervalo: ${INTERVAL_MS}ms, timeout: ${TICK_TIMEOUT_MS}ms)`,
  );

  return { stopSV };
}
