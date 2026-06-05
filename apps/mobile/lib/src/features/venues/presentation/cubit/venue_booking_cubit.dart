import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../catalog/data/catalog_repository.dart';
import '../../../matches/data/matches_repository.dart';
import '../../data/models/venue_dto.dart';
import '../../data/venues_repository.dart';
import 'venue_booking_state.dart';

class VenueBookingCubit extends Cubit<VenueBookingState> {
  VenueBookingCubit({
    required VenueDto venue,
    required VenuesRepository venuesRepository,
    required MatchesRepository matchesRepository,
    required CatalogRepository catalogRepository,
    DateTime? initialDate,
  })  : _venuesRepository = venuesRepository,
        _matchesRepository = matchesRepository,
        _catalogRepository = catalogRepository,
        super(
          VenueBookingState(
            venue: venue,
            selectedDate: initialDate ??
                DateTime(
                  DateTime.now().year,
                  DateTime.now().month,
                  DateTime.now().day,
                ),
          ),
        );

  final VenuesRepository _venuesRepository;
  final MatchesRepository _matchesRepository;
  final CatalogRepository _catalogRepository;

  // ---------------------------------------------------------------------------
  // load() — parallel fetch: sportId + courts + categories
  // ---------------------------------------------------------------------------

  Future<void> load() async {
    emit(state.copyWith(loading: true, error: null));

    try {
      final sportId = await _matchesRepository.resolveDefaultSportId();

      final courts = await _venuesRepository.listVenueCourts(
        venueId: state.venue.id,
        status: 'ACTIVE',
      );
      final categories = await _catalogRepository.listCategories(sportId: sportId);

      final firstCategoryId =
          categories.isNotEmpty ? categories.first.id : null;

      emit(state.copyWith(
        loading: false,
        courts: courts,
        categories: categories,
        sportId: sportId,
        selectedCategoryId: firstCategoryId,
        error: null,
      ));
    } on AppFailure catch (e) {
      emit(state.copyWith(loading: false, error: e.message));
    } catch (_) {
      emit(state.copyWith(
        loading: false,
        error: 'No pudimos cargar la información de la sede.',
      ));
    }
  }

  // ---------------------------------------------------------------------------
  // Date selection
  // ---------------------------------------------------------------------------

  void selectDate(DateTime date) {
    emit(state.copyWith(
      selectedDate: date,
      selectedSlot: null,
      slotsByCourtId: const {},
    ));
  }

  // ---------------------------------------------------------------------------
  // Court selection — triggers availability fetch
  // ---------------------------------------------------------------------------

  void selectCourt(String courtId) {
    emit(state.copyWith(
      selectedCourtId: courtId,
      selectedSlot: null,
      slotsLoadingCourtId: courtId,
    ));
    _loadSlotsForCourt(courtId);
  }

  Future<void> _loadSlotsForCourt(String courtId) async {
    final courtMatches = state.courts.where((c) => c.id == courtId);
    final court = courtMatches.isNotEmpty ? courtMatches.first : null;

    final durationMinutes = court?.durationMinutes ?? 90;

    final date = state.selectedDate;
    final from = DateTime(date.year, date.month, date.day);
    final to = DateTime(date.year, date.month, date.day, 23, 59, 59);

    try {
      final envelope = await _venuesRepository.getVenueAvailability(
        venueId: state.venue.id,
        courtId: courtId,
        from: from,
        to: to,
        durationMinutes: durationMinutes,
        sportId: state.sportId,
      );

      final courtsRaw = envelope['courts'];
      if (courtsRaw is! List) {
        emit(state.copyWith(slotsLoadingCourtId: null));
        return;
      }

      final courtEntry = courtsRaw.cast<Map<String, Object?>>().firstWhere(
            (c) => c['courtId'] == courtId,
            orElse: () => <String, Object?>{},
          );

      final slotsRaw = courtEntry['slots'];
      final slots = <String>[];
      if (slotsRaw is List) {
        for (final s in slotsRaw) {
          if (s is Map && s['isAvailable'] == true) {
            final scheduledAt = s['scheduledAt'];
            if (scheduledAt is String) slots.add(scheduledAt);
          }
        }
      }

      final updated = Map<String, List<String>>.of(state.slotsByCourtId)
        ..[courtId] = slots;

      emit(state.copyWith(
        slotsByCourtId: updated,
        slotsLoadingCourtId: null,
      ));
    } catch (_) {
      emit(state.copyWith(slotsLoadingCourtId: null));
    }
  }

  // ---------------------------------------------------------------------------
  // Simple setters
  // ---------------------------------------------------------------------------

  void selectSlot(String iso) => emit(state.copyWith(selectedSlot: iso));

  void selectCategory(String id) =>
      emit(state.copyWith(selectedCategoryId: id));

  void setAffectsElo(bool v) => emit(state.copyWith(affectsElo: v));

  void setGender(String? g) => emit(state.copyWith(gender: g));

  void setMaxParticipants(int n) =>
      emit(state.copyWith(maxParticipants: n.clamp(2, 8)));

  void setNotes(String s) => emit(state.copyWith(notes: s));

  // ---------------------------------------------------------------------------
  // submit()
  // ---------------------------------------------------------------------------

  Future<void> submit() async {
    if (!state.canSubmit) return;

    emit(state.copyWith(submitting: true, error: null));

    try {
      final scheduledAt = state.selectedSlot != null
          ? DateTime.parse(state.selectedSlot!)
          : null;

      final match = await _matchesRepository.createMatch(
        sportId: state.sportId ?? '',
        categoryId: state.selectedCategoryId!,
        type: 'OPEN',
        courtId: state.selectedCourtId,
        venueId: state.venue.id,
        scheduledAt: scheduledAt,
        maxParticipants: state.maxParticipants,
        pricePerPlayerCents: state.pricePerPlayerCents,
        durationMinutes: state.selectedCourt?.durationMinutes,
        notes: state.notes.isNotEmpty ? state.notes : null,
        affectsElo: state.affectsElo,
        gender: state.gender,
      );

      emit(state.copyWith(
        submitting: false,
        submittedMatchId: match.id,
        error: null,
      ));
    } on AppFailure catch (e) {
      emit(state.copyWith(submitting: false, error: e.message));
    } catch (_) {
      emit(state.copyWith(
        submitting: false,
        error: 'No pudimos crear el partido. Intentá de nuevo.',
      ));
    }
  }
}
