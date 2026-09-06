import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { startNotificationsWorkerSV } from '../../presentation/workers/notifications.worker.js';
import { ENV_CONST } from '../../config/env.js';

const dispatchUc = { executeSV: vi.fn() };
const expireUc = { executeSV: vi.fn() };

const PREV_ENV = ENV_CONST.NODE_ENV;
const PREV_ENABLED = ENV_CONST.NOTIFICATIONS_WORKER_ENABLED;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  //? El worker se apaga solo en `test`; hay que dejarlo arrancar para probarlo.
  (ENV_CONST as { NODE_ENV: string }).NODE_ENV = 'development';
  (ENV_CONST as { NOTIFICATIONS_WORKER_ENABLED: boolean }).NOTIFICATIONS_WORKER_ENABLED = true;

  dispatchUc.executeSV.mockResolvedValue({
    backlogEvents: 0,
    backlogDeliveries: 0,
    attemptedDeliveries: 0,
    failedDeliveries: 0,
  });
  expireUc.executeSV.mockResolvedValue({ expiredHolds: 0, notifiedTournaments: 0 });
});

afterEach(() => {
  vi.useRealTimers();
  (ENV_CONST as { NODE_ENV: string }).NODE_ENV = PREV_ENV;
  (ENV_CONST as { NOTIFICATIONS_WORKER_ENABLED: boolean }).NOTIFICATIONS_WORKER_ENABLED =
    PREV_ENABLED;
});

describe('startNotificationsWorkerSV — barrido de turnos apartados', () => {
  //? Sin esto los turnos apartados no vencen nunca y un jugador que no contesta
  //? le bloquea a la sede una cancha vendible para siempre.
  it('should sweep expired holds on every tick', async () => {
    const WORKER = startNotificationsWorkerSV(dispatchUc as never, null, expireUc as never);

    await vi.advanceTimersByTimeAsync(ENV_CONST.NOTIFICATIONS_WORKER_INTERVAL_MS + 10);
    WORKER?.stopSV();

    expect(expireUc.executeSV).toHaveBeenCalled();
  });

  //? El barrido crea eventos de aviso: corriendolo primero salen en este mismo
  //? tick en vez de esperar al siguiente.
  it('should sweep before dispatching, so its notices go out in the same tick', async () => {
    const ORDER: string[] = [];
    expireUc.executeSV.mockImplementation(async () => {
      ORDER.push('sweep');
      return { expiredHolds: 0, notifiedTournaments: 0 };
    });
    dispatchUc.executeSV.mockImplementation(async () => {
      ORDER.push('dispatch');
      return {
        backlogEvents: 0,
        backlogDeliveries: 0,
        attemptedDeliveries: 0,
        failedDeliveries: 0,
      };
    });

    const WORKER = startNotificationsWorkerSV(dispatchUc as never, null, expireUc as never);
    await vi.advanceTimersByTimeAsync(ENV_CONST.NOTIFICATIONS_WORKER_INTERVAL_MS + 10);
    WORKER?.stopSV();

    //? Puede haber corrido mas de un tick; lo que importa es el orden dentro de
    //? cada uno, no cuantos hubo.
    expect(ORDER.length % 2).toBe(0);
    for (let i = 0; i < ORDER.length; i += 2) {
      expect([ORDER[i], ORDER[i + 1]]).toEqual(['sweep', 'dispatch']);
    }
  });

  //? Despachar lo que ya esta encolado importa mas que soltar canchas: un
  //? barrido roto no puede dejar a los usuarios sin sus notificaciones.
  it('should still dispatch when the sweep fails', async () => {
    expireUc.executeSV.mockRejectedValue(new Error('base caida'));

    const WORKER = startNotificationsWorkerSV(dispatchUc as never, null, expireUc as never);
    await vi.advanceTimersByTimeAsync(ENV_CONST.NOTIFICATIONS_WORKER_INTERVAL_MS + 10);
    WORKER?.stopSV();

    expect(dispatchUc.executeSV).toHaveBeenCalled();
  });

  it('should keep working when no sweeper is wired', async () => {
    const WORKER = startNotificationsWorkerSV(dispatchUc as never, null);

    await vi.advanceTimersByTimeAsync(ENV_CONST.NOTIFICATIONS_WORKER_INTERVAL_MS + 10);
    WORKER?.stopSV();

    expect(dispatchUc.executeSV).toHaveBeenCalled();
  });
});
