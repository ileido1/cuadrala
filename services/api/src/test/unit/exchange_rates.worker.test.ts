import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RefreshExchangeRatesUseCase } from '../../application/use_cases/refresh_exchange_rates.use_case.js';
import type { DistributedLockRepository } from '../../domain/ports/distributed_lock_repository.js';
import { startExchangeRatesWorkerSV } from '../../presentation/workers/exchange_rates.worker.js';

//? El worker se salta solo cuando NODE_ENV === 'test', que es justo el entorno
//? donde corren estos casos. Se fuerza 'development' para poder ejercitarlo.
vi.mock('../../config/env.js', () => ({
  ENV_CONST: {
    NODE_ENV: 'development',
    EXCHANGE_RATES_WORKER_ENABLED: true,
    EXCHANGE_RATES_WORKER_INTERVAL_MS: 60_000,
    EXCHANGE_RATES_WORKER_TICK_TIMEOUT_MS: 30_000,
    EXCHANGE_RATES_WORKER_COUNTRY_CODE: 'VE',
  },
}));

function buildUseCaseSV(): RefreshExchangeRatesUseCase {
  return {
    executeSV: vi.fn().mockResolvedValue({ items: [] }),
  } as unknown as RefreshExchangeRatesUseCase;
}

function buildLockSV(_acquired = true): DistributedLockRepository {
  return {
    tryAcquireSV: vi.fn().mockResolvedValue(_acquired),
    releaseSV: vi.fn().mockResolvedValue(undefined),
  } as unknown as DistributedLockRepository;
}

describe('startExchangeRatesWorkerSV', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('refresca apenas arranca, sin esperar el primer intervalo', async () => {
    const UC = buildUseCaseSV();

    const HANDLE = startExchangeRatesWorkerSV(UC, buildLockSV());
    await vi.advanceTimersByTimeAsync(0);

    expect(UC.executeSV).toHaveBeenCalledWith('VE');
    expect(UC.executeSV).toHaveBeenCalledTimes(1);
    HANDLE?.stopSV();
  });

  it('vuelve a refrescar en cada intervalo', async () => {
    const UC = buildUseCaseSV();

    const HANDLE = startExchangeRatesWorkerSV(UC, buildLockSV());
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60_000);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(UC.executeSV).toHaveBeenCalledTimes(3);
    HANDLE?.stopSV();
  });

  it('no refresca si otra instancia tiene el lock', async () => {
    const UC = buildUseCaseSV();

    const HANDLE = startExchangeRatesWorkerSV(UC, buildLockSV(false));
    await vi.advanceTimersByTimeAsync(0);

    expect(UC.executeSV).not.toHaveBeenCalled();
    HANDLE?.stopSV();
  });

  it('suelta el lock aunque el refresh falle', async () => {
    const UC = buildUseCaseSV();
    vi.mocked(UC.executeSV).mockRejectedValue(new Error('dolarapi caida'));
    const LOCK = buildLockSV();

    const HANDLE = startExchangeRatesWorkerSV(UC, LOCK);
    await vi.advanceTimersByTimeAsync(0);

    expect(LOCK.releaseSV).toHaveBeenCalledWith('exchange_rates_refresh_worker');
    HANDLE?.stopSV();
  });

  it('sigue vivo tras un fallo: la caída del proveedor no mata el worker', async () => {
    const UC = buildUseCaseSV();
    vi.mocked(UC.executeSV)
      .mockRejectedValueOnce(new Error('dolarapi caida'))
      .mockResolvedValue({ items: [] });

    const HANDLE = startExchangeRatesWorkerSV(UC, buildLockSV());
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(UC.executeSV).toHaveBeenCalledTimes(2);
    HANDLE?.stopSV();
  });

  it('deja de refrescar después de stopSV', async () => {
    const UC = buildUseCaseSV();

    const HANDLE = startExchangeRatesWorkerSV(UC, buildLockSV());
    await vi.advanceTimersByTimeAsync(0);
    HANDLE?.stopSV();
    await vi.advanceTimersByTimeAsync(60_000 * 5);

    expect(UC.executeSV).toHaveBeenCalledTimes(1);
  });

  it('funciona sin lock (instancia única)', async () => {
    const UC = buildUseCaseSV();

    const HANDLE = startExchangeRatesWorkerSV(UC, null);
    await vi.advanceTimersByTimeAsync(0);

    expect(UC.executeSV).toHaveBeenCalledWith('VE');
    HANDLE?.stopSV();
  });
});
