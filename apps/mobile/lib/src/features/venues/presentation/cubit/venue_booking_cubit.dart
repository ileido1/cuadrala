import 'dart:developer' as developer;

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../../core/venue/opening_hours.dart';
import '../../../matches/data/matches_repository.dart';
import '../../../onboarding/data/onboarding_repository.dart';
import '../../data/models/venue_dto.dart';
import '../../data/venues_repository.dart';
import 'venue_booking_state.dart';

class VenueBookingCubit extends Cubit<VenueBookingState> {
  VenueBookingCubit({
    required VenueDto venue,
    required VenuesRepository venuesRepository,
    required MatchesRepository matchesRepository,
    required OnboardingRepository onboardingRepository,
    DateTime? initialDate,
  })  : _venuesRepository = venuesRepository,
        _matchesRepository = matchesRepository,
        _onboardingRepository = onboardingRepository,
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
  final OnboardingRepository _onboardingRepository;

  // ---------------------------------------------------------------------------
  // load() — sportId + courts + categoría del jugador (no editable)
  // ---------------------------------------------------------------------------

  Future<void> load() async {
    emit(state.copyWith(loading: true, error: null));

    try {
      final sportId = await _matchesRepository.resolveDefaultSportId();

      final courts = await _venuesRepository.listVenueCourts(
        venueId: state.venue.id,
        status: 'ACTIVE',
      );

      // La categoría de la partida se fija a la del jugador para este deporte
      // (no se elige a mano): se deriva de su perfil. Subir/bajar de categoría
      // depende del ELO, no de una selección manual. Si el jugador no tiene
      // categoría en este deporte, queda null y el submit se bloquea en la UI.
      final profiles = await _onboardingRepository.listSportProfiles();
      final profileMatches = profiles.where((p) => p.sportId == sportId);
      final profile = profileMatches.isNotEmpty ? profileMatches.first : null;

      emit(state.copyWith(
        loading: false,
        courts: courts,
        sportId: sportId,
        selectedCategoryId: profile?.categoryId,
        playerCategoryLabel: profile?.categoryLabel,
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
      slotsErrorByCourtId: const {},
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

    // Ventana anclada al horario de la sede (REQ-MVOH-003/004): el rango cubre
    // solo [apertura, cierre) del día elegido, no 00:00–23:59 genérico. Así los
    // bloques empiezan en la apertura (ej. 07:00, 08:30, 10:00 para bloques 1:30).
    // Convención wall-clock-as-UTC: el backend interpreta los componentes UTC del
    // instante como la hora local de la sede; por eso se construye con DateTime.utc
    // usando los minutos de apertura/cierre tal cual (sin conversión de timezone).
    final date = state.selectedDate;
    final iso = '${date.year.toString().padLeft(4, '0')}-'
        '${date.month.toString().padLeft(2, '0')}-'
        '${date.day.toString().padLeft(2, '0')}';
    final dayHours = getDayHoursForDate(iso, state.venue.openingHours);

    // Día cerrado: estado vacío explícito, sin solicitar disponibilidad al backend.
    if (dayHours == null) {
      final emptied = Map<String, List<String>>.of(state.slotsByCourtId)
        ..[courtId] = const <String>[];
      final clearedErrors = Map<String, String>.of(state.slotsErrorByCourtId)
        ..remove(courtId);
      emit(state.copyWith(
        slotsByCourtId: emptied,
        slotsErrorByCourtId: clearedErrors,
        slotsLoadingCourtId: null,
      ));
      return;
    }

    final from = DateTime.utc(
      date.year,
      date.month,
      date.day,
      dayHours.openMinutes ~/ 60,
      dayHours.openMinutes % 60,
    );
    final to = DateTime.utc(
      date.year,
      date.month,
      date.day,
      dayHours.closeMinutes ~/ 60,
      dayHours.closeMinutes % 60,
    );

    // Invariante ambos-o-ninguno: el backend exige sportId junto a categoryId.
    final sportId = state.sportId;
    final categoryId = state.selectedCategoryId;
    final sendTaxonomy = sportId != null && categoryId != null;

    try {
      final envelope = await _venuesRepository.getVenueAvailability(
        venueId: state.venue.id,
        courtId: courtId,
        from: from,
        to: to,
        durationMinutes: durationMinutes,
        // Bloques consecutivos del tamaño configurado por la cancha: el paso de
        // la rejilla = duración del bloque (1:00 / 1:30 / 2:00…), no 30 min fijo.
        stepMinutes: durationMinutes,
        sportId: sendTaxonomy ? sportId : null,
        categoryId: sendTaxonomy ? categoryId : null,
      );

      final courtsRaw = envelope['courts'];
      if (courtsRaw is! List) {
        emit(state.copyWith(slotsLoadingCourtId: null));
        return;
      }

      // La respuesta agrupa por cancha como { court: { id, name, venueId }, slots }.
      // El id de la cancha vive en court.id (no en un campo plano courtId).
      final courtEntry = courtsRaw.cast<Map<String, Object?>>().firstWhere(
            (c) {
              final court = c['court'];
              return court is Map && court['id'] == courtId;
            },
            orElse: () => <String, Object?>{},
          );

      // Cuando el día seleccionado es hoy, ocultamos los horarios ya pasados.
      // "Ahora" se expresa en la misma convención wall-clock-as-UTC: los
      // componentes locales del reloj del dispositivo tratados como hora de sede.
      final now = DateTime.now();
      final isToday =
          date.year == now.year && date.month == now.month && date.day == now.day;
      final nowWallClock = DateTime.utc(
        now.year,
        now.month,
        now.day,
        now.hour,
        now.minute,
        now.second,
      );

      final slotsRaw = courtEntry['slots'];
      final slots = <String>[];
      if (slotsRaw is List) {
        for (final s in slotsRaw) {
          if (s is Map && s['isAvailable'] == true) {
            final scheduledAt = s['scheduledAt'];
            if (scheduledAt is! String) continue;
            if (isToday) {
              final dt = DateTime.tryParse(scheduledAt);
              if (dt != null && dt.isBefore(nowWallClock)) continue;
            }
            slots.add(scheduledAt);
          }
        }
      }

      final updated = Map<String, List<String>>.of(state.slotsByCourtId)
        ..[courtId] = slots;
      final clearedErrors = Map<String, String>.of(state.slotsErrorByCourtId)
        ..remove(courtId);

      emit(state.copyWith(
        slotsByCourtId: updated,
        slotsErrorByCourtId: clearedErrors,
        slotsLoadingCourtId: null,
      ));
    } catch (e, st) {
      developer.log(
        'No se pudieron cargar horarios para court $courtId',
        name: 'VenueBookingCubit',
        error: e,
        stackTrace: st,
      );
      final message =
          e is AppFailure ? e.message : 'No pudimos cargar los horarios.';
      final errors = Map<String, String>.of(state.slotsErrorByCourtId)
        ..[courtId] = message;
      emit(state.copyWith(
        slotsErrorByCourtId: errors,
        slotsLoadingCourtId: null,
      ));
    }
  }

  // ---------------------------------------------------------------------------
  // Simple setters
  // ---------------------------------------------------------------------------

  void selectSlot(String iso) => emit(state.copyWith(selectedSlot: iso));

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

      // No se envía `type`: el backend usa su default (REGULAR). Mobile no debe
      // mandar 'OPEN' porque el contrato (Zod .strict) solo acepta
      // AMERICANO|REGULAR y lo rechazaría con 400.
      final match = await _matchesRepository.createMatch(
        sportId: state.sportId ?? '',
        categoryId: state.selectedCategoryId!,
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
