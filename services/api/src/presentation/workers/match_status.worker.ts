import type { UpdateMatchStatusUseCase } from '../../application/use_cases/update_match_status.use_case.js';
import { ENV_CONST } from '../../config/env.js';
import type { DistributedLockRepository } from '../../domain/ports/distributed_lock_repository.js';

export type MatchStatusWorkerHandle = { stopSV: () => void };

export function startMatchStatusWorkerSV(
  _updateMatchStatusUC: UpdateMatchStatusUseCase,
  _distributedLockRepository: DistributedLockRepository | null = null,
): MatchStatusWorkerHandle | null {
  //? 1. Verificar si debe ejecutarse (saltar en tests, verificar feature flag)
  if (ENV_CONST.NODE_ENV === 'test') {
    return null;
  }

  if (!ENV_CONST.MATCH_STATUS_WORKER_ENABLED) {
    console.log('[worker] Match status worker no activado (ver env MATCH_STATUS_WORKER_ENABLED).');
    return null;
  }

  //? 2. Configurar intervalo y timeout
  const INTERVAL_MS = ENV_CONST.MATCH_STATUS_WORKER_INTERVAL_MS;
  const TICK_TIMEOUT_MS = ENV_CONST.MATCH_STATUS_WORKER_TICK_TIMEOUT_MS;

  let isRunning = false;

  //? 3. Definir función tick (actualiza estado de partidas)
  const tickSV = async (): Promise<void> => {
    if (isRunning) {
      console.log('[worker] Match status: tick anterior aún en progreso, saltando...');
      return;
    }

    isRunning = true;
    const TICK_STARTED_AT = Date.now();

    try {
      if (_distributedLockRepository !== null) {
        const LOCKED = await _distributedLockRepository.tryAcquireSV('match_status_update_worker');
        if (!LOCKED) {
          console.log('[worker] Match status: no adquirió lock (otra instancia ejecutando).');
          return;
        }
      }

      const RES = await Promise.race([
        _updateMatchStatusUC.execute(),
        new Promise<never>(
          (_resolve, _reject) =>
            setTimeout(() => _reject(new Error('tick_timeout')), TICK_TIMEOUT_MS),
        ),
      ]);

      if (RES.updatedCount > 0) {
        console.log(
          JSON.stringify({
            kind: 'match_status.update.tick',
            status: 'SUCCESS',
            updatedCount: RES.updatedCount,
            elapsedMs: Date.now() - TICK_STARTED_AT,
          }),
        );
      }
    } catch (_error) {
      const ELAPSED_MS = Date.now() - TICK_STARTED_AT;
      const IS_TIMEOUT = _error instanceof Error && _error.message === 'tick_timeout';

      console.log(
        JSON.stringify({
          kind: 'match_status.update.tick',
          status: 'FAILED',
          elapsedMs: ELAPSED_MS,
          errorCode: IS_TIMEOUT ? 'tick_timeout' : 'tick_failed',
          errorMessage: _error instanceof Error ? _error.message : String(_error),
        }),
      );
    } finally {
      if (_distributedLockRepository !== null) {
        try {
          await _distributedLockRepository.releaseSV('match_status_update_worker');
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
    `[worker] Match status worker iniciado (intervalo: ${INTERVAL_MS}ms, timeout: ${TICK_TIMEOUT_MS}ms)`,
  );

  return { stopSV };
}
