import 'package:equatable/equatable.dart';

import '../../data/models/notification_delivery_dto.dart';

enum NotificationsStatus { idle, loading, loaded, error }

final class NotificationsState extends Equatable {
  const NotificationsState({
    required this.status,
    required this.onlyUnread,
    required this.items,
    required this.isMutating,
    this.errorMessage,
  });

  factory NotificationsState.initial() => const NotificationsState(
        status: NotificationsStatus.idle,
        onlyUnread: false,
        items: [],
        isMutating: false,
      );

  final NotificationsStatus status;
  final bool onlyUnread;
  final List<NotificationDeliveryDto> items;
  final bool isMutating;
  final String? errorMessage;

  NotificationsState copyWith({
    NotificationsStatus? status,
    bool? onlyUnread,
    List<NotificationDeliveryDto>? items,
    bool? isMutating,
    String? errorMessage,
    bool clearError = false,
  }) {
    return NotificationsState(
      status: status ?? this.status,
      onlyUnread: onlyUnread ?? this.onlyUnread,
      items: items ?? this.items,
      isMutating: isMutating ?? this.isMutating,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [status, onlyUnread, items, isMutating, errorMessage];
}

