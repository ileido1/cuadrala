import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/backoffice_reservations_repository.dart';
import '../../data/backoffice_reservations_repository_interface.dart';
import '../../data/models/reservation_dto.dart';
import 'backoffice_reservations_state.dart';

final class BackofficeReservationsCubit extends Cubit<BackofficeReservationsState> {
  BackofficeReservationsCubit({
    required IBackofficeReservationsRepository repository,
    required String venueId,
  })  : _repository = repository,
        _venueId = venueId,
        super(_initialState());

  final IBackofficeReservationsRepository _repository;
  final String _venueId;

  static BackofficeReservationsState _initialState() {
    final now = DateTime.now();
    final monday = now.subtract(Duration(days: now.weekday - 1));
    final weekStart = DateTime(monday.year, monday.month, monday.day);
    final weekEnd = weekStart.add(const Duration(days: 6));
    return BackofficeReservationsState(
      status: BackofficeReservationsStatus.initial,
      weekStart: weekStart,
      weekEnd: weekEnd,
    );
  }

  Future<void> load() async {
    emit(state.copyWith(status: BackofficeReservationsStatus.loading, clearError: true));
    try {
      final reservations = await _repository.listReservations(
        venueId: _venueId,
        from: state.weekStart,
        to: state.weekEnd,
      );
      emit(state.copyWith(
        status: BackofficeReservationsStatus.loaded,
        reservations: reservations,
      ));
    } on AppFailure catch (e) {
      emit(state.copyWith(
        status: BackofficeReservationsStatus.failure,
        error: e.message,
      ));
    } on Object {
      emit(state.copyWith(
        status: BackofficeReservationsStatus.failure,
        error: 'No se pudieron cargar las reservas.',
      ));
    }
  }

  Future<void> createReservation({
    required String courtId,
    required DateTime date,
    required String startTime,
    required String endTime,
    required ReservationType type,
    String? notes,
  }) async {
    emit(state.copyWith(saving: true, clearError: true));
    try {
      await _repository.createReservation(
        venueId: _venueId,
        courtId: courtId,
        date: date,
        startTime: startTime,
        endTime: endTime,
        type: type,
        notes: notes,
      );
      await load();
    } on AppFailure catch (e) {
      emit(state.copyWith(saving: false, error: e.message));
    } on Object {
      emit(state.copyWith(saving: false, error: 'No se pudo crear la reserva.'));
    }
  }

  Future<void> cancelReservation({required String reservationId}) async {
    emit(state.copyWith(saving: true, clearError: true));
    try {
      await _repository.cancelReservation(
        venueId: _venueId,
        reservationId: reservationId,
      );
      await load();
    } on AppFailure catch (e) {
      emit(state.copyWith(saving: false, error: e.message));
    } on Object {
      emit(state.copyWith(saving: false, error: 'No se pudo cancelar la reserva.'));
    }
  }

  Future<void> blockSlot({
    required String courtId,
    required DateTime date,
    required String startTime,
    required String endTime,
  }) async {
    emit(state.copyWith(saving: true, clearError: true));
    try {
      await _repository.blockSlot(
        venueId: _venueId,
        courtId: courtId,
        date: date,
        startTime: startTime,
        endTime: endTime,
      );
      await load();
    } on AppFailure catch (e) {
      emit(state.copyWith(saving: false, error: e.message));
    } on Object {
      emit(state.copyWith(saving: false, error: 'No se pudo bloquear el horario.'));
    }
  }

  Future<void> unblockSlot({
    required String courtId,
    required DateTime date,
    required String startTime,
    required String endTime,
  }) async {
    emit(state.copyWith(saving: true, clearError: true));
    try {
      await _repository.unblockSlot(
        venueId: _venueId,
        courtId: courtId,
        date: date,
        startTime: startTime,
        endTime: endTime,
      );
      await load();
    } on AppFailure catch (e) {
      emit(state.copyWith(saving: false, error: e.message));
    } on Object {
      emit(state.copyWith(saving: false, error: 'No se pudo desbloquear el horario.'));
    }
  }

  void goToNextWeek() {
    final nextWeekStart = state.weekStart.add(const Duration(days: 7));
    final nextWeekEnd = state.weekEnd.add(const Duration(days: 7));
    emit(state.copyWith(
      weekStart: nextWeekStart,
      weekEnd: nextWeekEnd,
    ));
    load();
  }

  void goToPreviousWeek() {
    final prevWeekStart = state.weekStart.subtract(const Duration(days: 7));
    final prevWeekEnd = state.weekEnd.subtract(const Duration(days: 7));
    emit(state.copyWith(
      weekStart: prevWeekStart,
      weekEnd: prevWeekEnd,
    ));
    load();
  }
}