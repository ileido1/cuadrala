import 'package:flutter_bloc/flutter_bloc.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/notifications/data/models/notification_delivery_dto.dart';

import '../../data/notifications_repository.dart';
import 'notifications_state.dart';

class NotificationsCubit extends Cubit<NotificationsState> {
  NotificationsCubit({required NotificationsRepository repository})
      : _repository = repository,
        super(NotificationsState.initial());

  final NotificationsRepository _repository;

  Future<void> load({bool? onlyUnread}) async {
    emit(
      state.copyWith(
        status: NotificationsStatus.loading,
        onlyUnread: onlyUnread ?? state.onlyUnread,
        clearError: true,
      ),
    );
    try {
      final result = await _repository.listMyNotifications(onlyUnread: onlyUnread ?? state.onlyUnread);
      emit(state.copyWith(status: NotificationsStatus.loaded, items: result.items));
    } on AppFailure catch (e) {
      emit(state.copyWith(status: NotificationsStatus.error, errorMessage: e.message));
    } catch (e) {
      emit(state.copyWith(
        status: NotificationsStatus.error,
        errorMessage: 'No pudimos cargar las notificaciones. Reintentar.',
      ));
    }
  }

  Future<void> toggleOnlyUnread(bool value) async {
    await load(onlyUnread: value);
  }

  Future<void> markAllAsRead() async {
    if (state.isMutating) return;
    emit(state.copyWith(isMutating: true, clearError: true));
    try {
      await _repository.markAllAsRead();
      await load(onlyUnread: state.onlyUnread);
      // `load()` no toca `isMutating` — sin esto queda en `true` para siempre
      // tras un éxito y el botón de "marcar todas como leídas" no se reactiva.
      emit(state.copyWith(isMutating: false));
    } catch (e) {
      emit(state.copyWith(isMutating: false, errorMessage: 'No pudimos marcar como leídas. Reintentar.'));
    }
  }

  Future<void> markOneAsRead(String deliveryId) async {
    if (state.isMutating) return;
    emit(state.copyWith(isMutating: true, clearError: true));
    try {
      await _repository.markAsRead(deliveryId);
      final next = state.items
          .map((n) => n.id == deliveryId
              ? NotificationDeliveryDto(
                  id: n.id,
                  type: n.type,
                  title: n.title,
                  body: n.body,
                  createdAt: n.createdAt,
                  readAt: DateTime.now(),
                  deepLink: n.deepLink,
                )
              : n)
          .toList();
      emit(state.copyWith(isMutating: false, items: next));
    } catch (e) {
      emit(state.copyWith(isMutating: false, errorMessage: 'No pudimos marcar como leída. Reintentar.'));
    }
  }
}

