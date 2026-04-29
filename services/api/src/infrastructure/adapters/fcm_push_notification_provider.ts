import { AppError } from '../../domain/errors/app_error.js';
import { Buffer } from 'node:buffer';
import type {
  PushNotificationMessageDTO,
  PushNotificationProvider,
  PushSendResultDTO,
} from '../../domain/ports/push_notification_provider.js';

type ServiceAccountDTO = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function parseServiceAccountFromBase64SV(_b64: string): ServiceAccountDTO {
  let json = '';
  try {
    json = Buffer.from(_b64, 'base64').toString('utf8');
  } catch (_error) {
    throw new AppError('FCM_CREDENCIALES_INVALIDAS', 'Credenciales FCM inválidas.', 500, {
      cause: _error,
    });
  }

  try {
    return JSON.parse(json) as ServiceAccountDTO;
  } catch (_error) {
    throw new AppError('FCM_CREDENCIALES_INVALIDAS', 'Credenciales FCM inválidas.', 500, {
      cause: _error,
    });
  }
}

export class FcmPushNotificationProvider implements PushNotificationProvider {
  private _initialized = false;
  private _messaging: null | {
    sendEachForMulticast: (_payload: unknown) => Promise<{
      responses: Array<{ success: boolean; error?: { message?: string; code?: string } }>;
      successCount?: number;
      failureCount?: number;
    }>;
  } = null;

  constructor(
    private readonly _serviceAccountJsonBase64: string,
    private readonly _dryRun: boolean,
  ) {}

  private async initSV(): Promise<void> {
    if (this._initialized) {
      return;
    }

    const SERVICE_ACCOUNT = parseServiceAccountFromBase64SV(this._serviceAccountJsonBase64);

    // Lazy import to avoid requiring firebase-admin in unit/contract contexts.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ADMIN = await import('firebase-admin');

    if (ADMIN.apps.length === 0) {
      ADMIN.initializeApp({
        credential: ADMIN.credential.cert({
          projectId: SERVICE_ACCOUNT.project_id,
          clientEmail: SERVICE_ACCOUNT.client_email,
          privateKey: SERVICE_ACCOUNT.private_key,
        }),
      });
    }

    this._messaging = ADMIN.messaging();
    this._initialized = true;
  }

  async sendToDeviceTokensSV(
    _deviceTokens: string[],
    _message: PushNotificationMessageDTO,
  ): Promise<PushSendResultDTO> {
    if (_deviceTokens.length === 0) {
      return { successCount: 0, failureCount: 0, failures: [] };
    }

    await this.initSV();
    if (this._messaging === null) {
      return {
        successCount: 0,
        failureCount: _deviceTokens.length,
        failures: _deviceTokens.map((_t) => ({ token: _t, error: 'No inicializado' })),
      };
    }

    const RES = await this._messaging.sendEachForMulticast({
      tokens: _deviceTokens,
      notification: { title: _message.title, body: _message.body },
      data: _message.data,
      android: { priority: 'high' },
      apns: { headers: { 'apns-priority': '10' } },
      fcmOptions: { analyticsLabel: 'dispatch' },
      dryRun: this._dryRun,
    });

    const failures: Array<{ token: string; error: string; errorCode?: string }> = [];
    for (let i = 0; i < RES.responses.length; i += 1) {
      const R = RES.responses[i];
      if (!R.success) {
        failures.push({
          token: _deviceTokens[i] ?? 'unknown',
          error: R.error?.message ?? 'Error desconocido',
          errorCode: R.error?.code,
        });
      }
    }

    return {
      successCount: RES.successCount ?? (_deviceTokens.length - failures.length),
      failureCount: RES.failureCount ?? failures.length,
      failures,
    };
  }
}

