import 'package:equatable/equatable.dart';

import '../../../onboarding/data/models/user_availability_dto.dart';

enum AvailabilityStatus { initial, loading, loaded, failure }

final class AvailabilityState extends Equatable {
  const AvailabilityState({
    this.status = AvailabilityStatus.initial,
    this.slots = const [],
    this.saving = false,
    this.error,
  });

  final AvailabilityStatus status;
  final List<UserAvailabilityDto> slots;
  final bool saving;
  final String? error;

  AvailabilityState copyWith({
    AvailabilityStatus? status,
    List<UserAvailabilityDto>? slots,
    bool? saving,
    String? error,
    bool clearError = false,
  }) {
    return AvailabilityState(
      status: status ?? this.status,
      slots: slots ?? this.slots,
      saving: saving ?? this.saving,
      error: clearError ? null : error ?? this.error,
    );
  }

  @override
  List<Object?> get props => [status, slots, saving, error];
}
