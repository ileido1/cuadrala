import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/notifications_repository.dart';
import 'notification_prefs_state.dart';

final class NotificationPrefsCubit extends Cubit<NotificationPrefsState> {
  NotificationPrefsCubit({required NotificationsRepository repository})
      : _repository = repository,
        super(const NotificationPrefsInitial());

  final NotificationsRepository _repository;

  Future<void> load() async {
    emit(const NotificationPrefsLoading());
    try {
      final subscriptions = await _repository.listMySubscriptions();
      emit(NotificationPrefsLoaded(subscriptions: subscriptions));
    } on AppFailure catch (e) {
      emit(NotificationPrefsFailure(message: e.message));
    } catch (_) {
      emit(const NotificationPrefsFailure(message: 'No se pudieron cargar las preferencias.'));
    }
  }

  Future<void> toggleType(String type, bool enabled) async {
    final current = state;
    if (current is! NotificationPrefsLoaded) return;
    if (current.saving) return;

    emit(NotificationPrefsLoaded(subscriptions: current.subscriptions, saving: true));

    try {
      final currentTypes = current.enabledTypes;
      currentTypes[type] = enabled;

      await _repository.upsertSubscription(
        enabled: true,
        enabledTypes: currentTypes,
      );

      final refreshed = await _repository.listMySubscriptions();
      emit(NotificationPrefsLoaded(subscriptions: refreshed, saving: false));
    } on AppFailure catch (e) {
      emit(NotificationPrefsLoaded(
        subscriptions: current.subscriptions,
        saving: false,
        saveError: e.message,
      ));
    } catch (_) {
      emit(NotificationPrefsLoaded(
        subscriptions: current.subscriptions,
        saving: false,
        saveError: 'No se pudo guardar la preferencia.',
      ));
    }
  }
}
