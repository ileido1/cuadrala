import '../../../core/network/api_client.dart';

abstract interface class NotificationsApi {
  Future<Map<String, Object?>> listMyNotificationsEnvelope({
    required String status,
    int page,
    int limit,
  });

  Future<void> markAsRead({required String deliveryId});
  Future<void> markAllAsRead();

  Future<Map<String, Object?>> listMySubscriptionsEnvelope();

  Future<Map<String, Object?>> upsertSubscriptionEnvelope({
    required Map<String, Object?> body,
  });

  Future<void> disableSubscription({required String subscriptionId});

  Future<Map<String, Object?>> listMyDevicePushTokensEnvelope();

  Future<Map<String, Object?>> upsertDevicePushTokenEnvelope({
    required Map<String, Object?> body,
  });

  Future<void> disableDevicePushToken({required String tokenId});
}

final class DioNotificationsApi implements NotificationsApi {
  const DioNotificationsApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> listMyNotificationsEnvelope({
    required String status,
    int page = 1,
    int limit = 20,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/users/me/notifications',
      queryParameters: {'status': status, 'page': page, 'limit': limit},
    );
  }

  @override
  Future<void> markAsRead({required String deliveryId}) async {
    await _apiClient.patchJson('/api/v1/users/me/notifications/$deliveryId/read', body: const {});
  }

  @override
  Future<void> markAllAsRead() async {
    await _apiClient.patchJson('/api/v1/users/me/notifications/read-all', body: const {});
  }

  @override
  Future<Map<String, Object?>> listMySubscriptionsEnvelope() {
    return _apiClient.getEnvelopeDataMap('/api/v1/users/me/notification-subscriptions');
  }

  @override
  Future<Map<String, Object?>> upsertSubscriptionEnvelope({
    required Map<String, Object?> body,
  }) {
    return _apiClient.postJson('/api/v1/users/me/notification-subscriptions', body: body);
  }

  @override
  Future<void> disableSubscription({required String subscriptionId}) async {
    await _apiClient.postNoContent('/api/v1/users/me/notification-subscriptions/$subscriptionId');
  }

  @override
  Future<Map<String, Object?>> listMyDevicePushTokensEnvelope() {
    return _apiClient.getEnvelopeDataMap('/api/v1/users/me/device-push-tokens');
  }

  @override
  Future<Map<String, Object?>> upsertDevicePushTokenEnvelope({
    required Map<String, Object?> body,
  }) {
    return _apiClient.postJson('/api/v1/users/me/device-push-tokens', body: body);
  }

  @override
  Future<void> disableDevicePushToken({required String tokenId}) async {
    await _apiClient.postNoContent('/api/v1/users/me/device-push-tokens/$tokenId');
  }
}

