import 'package:equatable/equatable.dart';

import '../../data/models/notification_subscription_dto.dart';

sealed class NotificationPrefsState extends Equatable {
  const NotificationPrefsState();

  @override
  List<Object?> get props => [];
}

final class NotificationPrefsInitial extends NotificationPrefsState {
  const NotificationPrefsInitial();
}

final class NotificationPrefsLoading extends NotificationPrefsState {
  const NotificationPrefsLoading();
}

final class NotificationPrefsFailure extends NotificationPrefsState {
  const NotificationPrefsFailure({required this.message});
  final String message;

  @override
  List<Object?> get props => [message];
}

final class NotificationPrefsLoaded extends NotificationPrefsState {
  const NotificationPrefsLoaded({
    required this.subscriptions,
    this.saving = false,
    this.saveError,
  });

  final List<NotificationSubscriptionDto> subscriptions;
  final bool saving;
  final String? saveError;

  Map<String, bool> get enabledTypes {
    if (subscriptions.isEmpty) return _defaultTypes;
    final sub = subscriptions.first;
    final types = sub.enabledTypes;
    if (types == null) return _defaultTypes;
    return Map<String, bool>.from(types);
  }

  bool isTypeEnabled(String type) => enabledTypes[type] ?? true;

  static const _defaultTypes = {
    'MATCH_SLOT_OPENED': true,
    'MATCH_CANCELLED': true,
    'CHAT_MESSAGE': true,
    'PAYMENT_PENDING': true,
  };

  @override
  List<Object?> get props => [subscriptions, saving, saveError];
}
