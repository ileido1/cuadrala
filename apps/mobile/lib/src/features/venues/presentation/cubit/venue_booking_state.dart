import 'package:equatable/equatable.dart';

import '../../../catalog/data/models/category_dto.dart';
import '../../data/models/court_dto.dart';
import '../../data/models/venue_dto.dart';

final class VenueBookingState extends Equatable {
  const VenueBookingState({
    required this.venue,
    required this.selectedDate,
    this.loading = false,
    this.submitting = false,
    this.error,
    this.courts = const [],
    this.categories = const [],
    this.sportId,
    this.slotsByCourtId = const {},
    this.slotsLoadingCourtId,
    this.selectedCourtId,
    this.selectedSlot,
    this.selectedCategoryId,
    this.affectsElo = true,
    this.gender,
    this.maxParticipants = 4,
    this.notes = '',
    this.submittedMatchId,
  });

  final VenueDto venue;
  final DateTime selectedDate;
  final bool loading;
  final bool submitting;
  final String? error;
  final List<CourtDto> courts;
  final List<CategoryDto> categories;
  final String? sportId;

  /// courtId → list of available ISO scheduledAt strings.
  final Map<String, List<String>> slotsByCourtId;
  final String? slotsLoadingCourtId;
  final String? selectedCourtId;
  final String? selectedSlot;
  final String? selectedCategoryId;
  final bool affectsElo;
  final String? gender;
  final int maxParticipants;
  final String notes;

  /// Non-null when submission succeeds → triggers navigation in BlocListener.
  final String? submittedMatchId;

  // ---------------------------------------------------------------------------
  // Derived getters
  // ---------------------------------------------------------------------------

  bool get canSubmit =>
      selectedCourtId != null &&
      selectedSlot != null &&
      selectedCategoryId != null &&
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
    List<CategoryDto>? categories,
    Object? sportId = _sentinel,
    Map<String, List<String>>? slotsByCourtId,
    Object? slotsLoadingCourtId = _sentinel,
    Object? selectedCourtId = _sentinel,
    Object? selectedSlot = _sentinel,
    Object? selectedCategoryId = _sentinel,
    bool? affectsElo,
    Object? gender = _sentinel,
    int? maxParticipants,
    String? notes,
    Object? submittedMatchId = _sentinel,
  }) {
    return VenueBookingState(
      venue: venue ?? this.venue,
      selectedDate: selectedDate ?? this.selectedDate,
      loading: loading ?? this.loading,
      submitting: submitting ?? this.submitting,
      error: error == _sentinel ? this.error : error as String?,
      courts: courts ?? this.courts,
      categories: categories ?? this.categories,
      sportId: sportId == _sentinel ? this.sportId : sportId as String?,
      slotsByCourtId: slotsByCourtId ?? this.slotsByCourtId,
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
      affectsElo: affectsElo ?? this.affectsElo,
      gender: gender == _sentinel ? this.gender : gender as String?,
      maxParticipants: maxParticipants ?? this.maxParticipants,
      notes: notes ?? this.notes,
      submittedMatchId: submittedMatchId == _sentinel
          ? this.submittedMatchId
          : submittedMatchId as String?,
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
        categories,
        sportId,
        slotsByCourtId,
        slotsLoadingCourtId,
        selectedCourtId,
        selectedSlot,
        selectedCategoryId,
        affectsElo,
        gender,
        maxParticipants,
        notes,
        submittedMatchId,
      ];
}
