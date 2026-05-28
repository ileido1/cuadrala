import '../../../core/failures/app_failure.dart';
import 'models/notification_delivery_dto.dart';
import 'models/notification_subscription_dto.dart';
import 'notifications_api.dart';

final class PageInfo {
  const PageInfo({required this.page, required this.limit, required this.total});
  final int page;
  final int limit;
  final int total;
}

final class ListNotificationsResult {
  const ListNotificationsResult({required this.items, required this.pageInfo});
  final List<NotificationDeliveryDto> items;
  final PageInfo pageInfo;
}

class NotificationsRepository {
  NotificationsRepository({required NotificationsApi api}) : _api = api;

  final NotificationsApi _api;

  Future<ListNotificationsResult> listMyNotifications({
    required bool onlyUnread,
    int page = 1,
    int limit = 20,
  }) async {
    final data = await _api.listMyNotificationsEnvelope(
      status: onlyUnread ? 'unread' : 'all',
      page: page,
      limit: limit,
    );
    final rawItems = data['items'];
    if (rawItems is! List) {
      throw const AppFailure(code: 'INVALID_RESPONSE', message: 'Respuesta inválida del servidor.');
    }
    final pageInfoRaw = data['pageInfo'];
    if (pageInfoRaw is! Map) {
      throw const AppFailure(code: 'INVALID_RESPONSE', message: 'Respuesta inválida del servidor.');
    }
    final items = rawItems
        .whereType<Map<String, Object?>>()
        .map(NotificationDeliveryDto.fromJson)
        .toList();
    return ListNotificationsResult(
      items: items,
      pageInfo: PageInfo(
        page: (pageInfoRaw['page'] as num?)?.toInt() ?? page,
        limit: (pageInfoRaw['limit'] as num?)?.toInt() ?? limit,
        total: (pageInfoRaw['total'] as num?)?.toInt() ?? items.length,
      ),
    );
  }

  Future<void> markAsRead(String deliveryId) => _api.markAsRead(deliveryId: deliveryId);
  Future<void> markAllAsRead() => _api.markAllAsRead();

  Future<List<NotificationSubscriptionDto>> listMySubscriptions() async {
    final data = await _api.listMySubscriptionsEnvelope();
    final rawItems = data['items'];
    if (rawItems is! List) {
      throw const AppFailure(code: 'INVALID_RESPONSE', message: 'Respuesta inválida del servidor.');
    }
    return rawItems
        .whereType<Map<String, Object?>>()
        .map(NotificationSubscriptionDto.fromJson)
        .toList();
  }

  Future<NotificationSubscriptionDto> upsertSubscription({
    required bool enabled,
    Map<String, bool>? enabledTypes,
  }) async {
    final body = <String, Object?>{
      'enabled': enabled,
      'enabledTypes': ?enabledTypes,
    };
    final result = await _api.upsertSubscriptionEnvelope(body: body);
    final data = result['data'];
    if (data is Map<String, Object?>) {
      return NotificationSubscriptionDto.fromJson(data);
    }
    throw const AppFailure(code: 'INVALID_RESPONSE', message: 'Respuesta inválida del servidor.');
  }

  Future<void> disableSubscription(String subscriptionId) =>
      _api.disableSubscription(subscriptionId: subscriptionId);

  Future<void> registerPushToken({required String token, String? platform}) async {
    await _api.upsertDevicePushTokenEnvelope(body: {
      'token': token,
      'enabled': true,
      'platform': ?platform,
    });
  }

  Future<void> unregisterPushTokens() async {
    final tokens = await _api.listMyDevicePushTokensEnvelope();
    final rawItems = tokens['items'];
    if (rawItems is List) {
      for (final item in rawItems.whereType<Map<String, Object?>>()) {
        final id = item['id'] as String?;
        if (id != null && id.isNotEmpty) {
          try {
            await _api.disableDevicePushToken(tokenId: id);
          } catch (_) {
          }
        }
      }
    }
  }
}

