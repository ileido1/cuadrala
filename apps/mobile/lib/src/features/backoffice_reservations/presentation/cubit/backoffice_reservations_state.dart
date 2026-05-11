import 'package:equatable/equatable.dart';

import '../../data/models/reservation_dto.dart';

enum BackofficeReservationsStatus {
  initial,
  loading,
  loaded,
  failure,
}

final class BackofficeReservationsState extends Equatable {
  const BackofficeReservationsState({
    this.status = BackofficeReservationsStatus.initial,
    this.reservations = const [],
    this.error,
    this.saving = false,
    required this.weekStart,
    required this.weekEnd,
  });

  final BackofficeReservationsStatus status;
  final List<ReservationDto> reservations;
  final String? error;
  final bool saving;
  final DateTime weekStart;
  final DateTime weekEnd;

  BackofficeReservationsState copyWith({
    BackofficeReservationsStatus? status,
    List<ReservationDto>? reservations,
    String? error,
    bool? saving,
    DateTime? weekStart,
    DateTime? weekEnd,
    bool clearError = false,
  }) {
    return BackofficeReservationsState(
      status: status ?? this.status,
      reservations: reservations ?? this.reservations,
      error: clearError ? null : (error ?? this.error),
      saving: saving ?? this.saving,
      weekStart: weekStart ?? this.weekStart,
      weekEnd: weekEnd ?? this.weekEnd,
    );
  }

  @override
  List<Object?> get props => [status, reservations, error, saving, weekStart, weekEnd];
}