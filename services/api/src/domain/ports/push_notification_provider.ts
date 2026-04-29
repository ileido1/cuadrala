export type PushNotificationMessageDTO = {
  title: string;
  body: string;
  data: Record<string, string>;
};

export type PushSendResultDTO = {
  successCount: number;
  failureCount: number;
  failures: Array<{ token: string; error: string; errorCode?: string }>;
};

export interface PushNotificationProvider {
  sendToDeviceTokensSV(
    _deviceTokens: string[],
    _message: PushNotificationMessageDTO,
  ): Promise<PushSendResultDTO>;
}

