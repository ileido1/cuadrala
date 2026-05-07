import '../../../core/failures/app_failure.dart';
import 'models/notification_delivery_dto.dart';
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
}

