import 'package:equatable/equatable.dart';

import '../../data/models/booking_item.dart';

enum BackofficeReservationsStatus {
  initial,
  loading,
  loaded,
  failure,
}

final class BackofficeReservationsState extends Equatable {
  const BackofficeReservationsState({
    this.status = BackofficeReservationsStatus.initial,
    this.bookings = const [],
    this.error,
    this.saving = false,
    required this.weekStart,
    required this.weekEnd,
  });

  final BackofficeReservationsStatus status;
  final List<BookingItem> bookings;
  final String? error;
  final bool saving;
  final DateTime weekStart;
  final DateTime weekEnd;

  BackofficeReservationsState copyWith({
    BackofficeReservationsStatus? status,
    List<BookingItem>? bookings,
    String? error,
    bool? saving,
    DateTime? weekStart,
    DateTime? weekEnd,
    bool clearError = false,
  }) {
    return BackofficeReservationsState(
      status: status ?? this.status,
      bookings: bookings ?? this.bookings,
      error: clearError ? null : (error ?? this.error),
      saving: saving ?? this.saving,
      weekStart: weekStart ?? this.weekStart,
      weekEnd: weekEnd ?? this.weekEnd,
    );
  }

  @override
  List<Object?> get props => [status, bookings, error, saving, weekStart, weekEnd];
}