import type {
  PushNotificationMessageDTO,
  PushNotificationProvider,
  PushSendResultDTO,
} from '../../domain/ports/push_notification_provider.js';

export class NoopPushNotificationProvider implements PushNotificationProvider {
  async sendToDeviceTokensSV(
    _deviceTokens: string[],
    _message: PushNotificationMessageDTO,
  ): Promise<PushSendResultDTO> {
    void _message;

    // Permite simular fallos en tests sin dependencias externas:
    // - fcm-test-fail-...      => falla genérica
    // - fcm-test-invalid-...   => token inválido/no registrado (debe deshabilitarse)
    const failures: Array<{ token: string; error: string; errorCode?: string }> = [];
    for (const _t of _deviceTokens) {
      if (_t.startsWith('fcm-test-invalid-')) {
        failures.push({
          token: _t,
          error: 'Token no registrado.',
          errorCode: 'messaging/registration-token-not-registered',
        });
        continue;
      }
      if (_t.startsWith('fcm-test-fail-')) {
        failures.push({
          token: _t,
          error: 'Fallo forzado en Noop provider.',
          errorCode: 'messaging/internal-error',
        });
      }
    }

    return {
      successCount: _deviceTokens.length - failures.length,
      failureCount: failures.length,
      failures,
    };
  }
}

