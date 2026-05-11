import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../onboarding/data/models/user_availability_dto.dart';
import '../../data/availability_repository.dart';
import 'availability_state.dart';

final class AvailabilityCubit extends Cubit<AvailabilityState> {
  AvailabilityCubit({required AvailabilityRepository repository})
      : _repository = repository,
        super(const AvailabilityState());

  final AvailabilityRepository _repository;

  /// Indica si un par (day, slot) ya existe en la lista actual.
  bool containsSlot(DayOfWeek day, AvailabilitySlot slot) {
    return state.slots.any((s) => s.dayOfWeek == day && s.slot == slot);
  }

  Future<void> load() async {
    emit(state.copyWith(status: AvailabilityStatus.loading, clearError: true));
    try {
      final slots = await _repository.listAvailability();
      emit(state.copyWith(status: AvailabilityStatus.loaded, slots: slots));
    } on Object {
      emit(state.copyWith(
        status: AvailabilityStatus.failure,
        error: 'No se pudieron cargar tus horarios.',
      ));
    }
  }

  Future<void> addSlot(DayOfWeek day, AvailabilitySlot slot) async {
    if (containsSlot(day, slot)) return;
    final updated = [
      ...state.slots,
      UserAvailabilityDto(dayOfWeek: day, slot: slot),
    ];
    await _replaceAll(updated);
  }

  Future<void> removeSlot(DayOfWeek day, AvailabilitySlot slot) async {
    final updated = state.slots
        .where((s) => !(s.dayOfWeek == day && s.slot == slot))
        .toList();
    await _replaceAll(updated);
  }

  Future<void> _replaceAll(List<UserAvailabilityDto> updated) async {
    emit(state.copyWith(saving: true, clearError: true));
    try {
      final slots = await _repository.putAvailability(updated);
      emit(state.copyWith(saving: false, slots: slots));
    } on Object {
      emit(state.copyWith(
        saving: false,
        error: 'No se pudo guardar el horario.',
      ));
    }
  }
}
