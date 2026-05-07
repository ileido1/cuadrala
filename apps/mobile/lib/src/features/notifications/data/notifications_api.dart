import '../../../core/network/api_client.dart';

abstract interface class NotificationsApi {
  Future<Map<String, Object?>> listMyNotificationsEnvelope({
    required String status, // 'unread' | 'all'
    int page,
    int limit,
  });

  Future<void> markAsRead({required String deliveryId});
  Future<void> markAllAsRead();
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
}

