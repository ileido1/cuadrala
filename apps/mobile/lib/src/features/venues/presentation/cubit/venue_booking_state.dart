import 'package:equatable/equatable.dart';

import '../../data/models/court_dto.dart';
import '../../data/models/venue_dto.dart';
import 'slot_info.dart';

final class VenueBookingState extends Equatable {
  const VenueBookingState({
    required this.venue,
    required this.selectedDate,
    this.loading = false,
    this.submitting = false,
    this.error,
    this.courts = const [],
    this.sportId,
    this.slotsByCourtId = const {},
    this.slotsErrorByCourtId = const {},
    this.slotsLoadingCourtId,
    this.selectedCourtId,
    this.selectedSlot,
    this.selectedCategoryId,
    this.playerCategoryLabel,
    this.affectsElo = true,
    this.gender = 'MALE',
    this.maxParticipants = 4,
    this.notes = '',
    this.submittedMatchId,
    this.conflictingMatchId,
  });

  final VenueDto venue;
  final DateTime selectedDate;
  final bool loading;
  final bool submitting;
  final String? error;
  final List<CourtDto> courts;
  final String? sportId;

  /// courtId → franjas devueltas por el backend (disponibles + ocupadas con
  /// su motivo). La UI decide qué renderizar a partir de [SlotInfo.isAvailable].
  final Map<String, List<SlotInfo>> slotsByCourtId;

  /// courtId → mensaje de error de carga de horarios (no silencioso).
  final Map<String, String> slotsErrorByCourtId;
  final String? slotsLoadingCourtId;
  final String? selectedCourtId;
  final String? selectedSlot;

  /// Categoría del jugador para el deporte (fija, no editable). Null si el
  /// jugador no tiene categoría en este deporte → bloquea la creación.
  final String? selectedCategoryId;

  /// Etiqueta legible de la categoría del jugador (para mostrar read-only).
  final String? playerCategoryLabel;

  final bool affectsElo;
  final String? gender;
  final int maxParticipants;
  final String notes;

  /// Non-null when submission succeeds → triggers navigation in BlocListener.
  final String? submittedMatchId;

  /// Non-null when submission fails with CANCHA_OCUPADA / HORARIO_RESERVA_INCOMPATIBLE.
  /// Contains the ID of the conflicting match so we can offer a CTA.
  final String? conflictingMatchId;

  // ---------------------------------------------------------------------------
  // Derived getters
  // ---------------------------------------------------------------------------

  bool get canSubmit =>
      selectedCourtId != null &&
      selectedSlot != null &&
      selectedCategoryId != null &&
      gender != null &&
      gender!.isNotEmpty &&
      !submitting;

  CourtDto? get selectedCourt => courts.cast<CourtDto?>().firstWhere(
        (c) => c?.id == selectedCourtId,
        orElse: () => null,
      );

  /// Price per player in cents: court.pricePerHourCents * (durationMinutes/60) / maxParticipants.
  int? get pricePerPlayerCents {
    final court = selectedCourt;
    if (court == null) return null;
    final totalCents =
        (court.pricePerHourCents * court.durationMinutes / 60).round();
    if (maxParticipants == 0) return null;
    return (totalCents / maxParticipants).round();
  }

  // ---------------------------------------------------------------------------
  // copyWith — sentinel pattern for nullable fields
  // ---------------------------------------------------------------------------

  static const _sentinel = Object();

  VenueBookingState copyWith({
    VenueDto? venue,
    DateTime? selectedDate,
    bool? loading,
    bool? submitting,
    Object? error = _sentinel,
    List<CourtDto>? courts,
    Object? sportId = _sentinel,
    Map<String, List<SlotInfo>>? slotsByCourtId,
    Map<String, String>? slotsErrorByCourtId,
    Object? slotsLoadingCourtId = _sentinel,
    Object? selectedCourtId = _sentinel,
    Object? selectedSlot = _sentinel,
    Object? selectedCategoryId = _sentinel,
    Object? playerCategoryLabel = _sentinel,
    bool? affectsElo,
    Object? gender = _sentinel,
    int? maxParticipants,
    String? notes,
    Object? submittedMatchId = _sentinel,
    Object? conflictingMatchId = _sentinel,
  }) {
    return VenueBookingState(
      venue: venue ?? this.venue,
      selectedDate: selectedDate ?? this.selectedDate,
      loading: loading ?? this.loading,
      submitting: submitting ?? this.submitting,
      error: error == _sentinel ? this.error : error as String?,
      courts: courts ?? this.courts,
      sportId: sportId == _sentinel ? this.sportId : sportId as String?,
      slotsByCourtId: slotsByCourtId ?? this.slotsByCourtId,
      slotsErrorByCourtId: slotsErrorByCourtId ?? this.slotsErrorByCourtId,
      slotsLoadingCourtId: slotsLoadingCourtId == _sentinel
          ? this.slotsLoadingCourtId
          : slotsLoadingCourtId as String?,
      selectedCourtId: selectedCourtId == _sentinel
          ? this.selectedCourtId
          : selectedCourtId as String?,
      selectedSlot:
          selectedSlot == _sentinel ? this.selectedSlot : selectedSlot as String?,
      selectedCategoryId: selectedCategoryId == _sentinel
          ? this.selectedCategoryId
          : selectedCategoryId as String?,
      playerCategoryLabel: playerCategoryLabel == _sentinel
          ? this.playerCategoryLabel
          : playerCategoryLabel as String?,
      affectsElo: affectsElo ?? this.affectsElo,
      gender: gender == _sentinel ? this.gender : gender as String?,
      maxParticipants: maxParticipants ?? this.maxParticipants,
      notes: notes ?? this.notes,
      submittedMatchId: submittedMatchId == _sentinel
          ? this.submittedMatchId
          : submittedMatchId as String?,
      conflictingMatchId: conflictingMatchId == _sentinel
          ? this.conflictingMatchId
          : conflictingMatchId as String?,
    );
  }

  @override
  List<Object?> get props => [
        venue.id,
        selectedDate,
        loading,
        submitting,
        error,
        courts,
        sportId,
        slotsByCourtId,
        slotsErrorByCourtId,
        slotsLoadingCourtId,
        selectedCourtId,
        selectedSlot,
        selectedCategoryId,
        playerCategoryLabel,
        affectsElo,
        gender,
        maxParticipants,
        notes,
        submittedMatchId,
        conflictingMatchId,
      ];
}
