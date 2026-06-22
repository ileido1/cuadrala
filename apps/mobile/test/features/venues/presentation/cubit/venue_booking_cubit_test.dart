import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_api.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/models/category_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/court_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/venue_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/data/venues_repository.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_booking_cubit.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_booking_state.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockVenuesRepository extends Mock implements VenuesRepository {}

class _MockMatchesRepository extends Mock implements MatchesRepository {}

// CatalogRepository is final — mock CatalogApi and build a real CatalogRepository.
class _MockCatalogApi extends Mock implements CatalogApi {}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

VenueDto _venue({String id = 'venue-1', String name = 'Club Padel Norte'}) =>
    VenueDto(
      id: id,
      name: name,
      address: 'Av. Corrientes 1234',
      latitude: -34.6,
      longitude: -58.4,
    );

CourtDto _court({
  String id = 'court-1',
  String venueId = 'venue-1',
  String name = 'Pista 1',
  String status = 'ACTIVE',
  int pricePerHourCents = 10000,
  int durationMinutes = 90,
}) =>
    CourtDto(
      id: id,
      venueId: venueId,
      name: name,
      sportType: 'PADEL',
      indoor: true,
      lighting: true,
      status: status,
      createdAt: DateTime(2024),
      pricePerHourCents: pricePerHourCents,
      durationMinutes: durationMinutes,
    );

CategoryDto _category({String id = 'cat-1', String name = 'Primera'}) =>
    CategoryDto(
      id: id,
      sportId: 'sport-1',
      name: name,
      slug: 'primera',
      scheme: 'TIERED',
      sortOrder: 1,
    );

MatchDetailDto _matchDetail({String id = 'match-1'}) => MatchDetailDto(
      id: id,
      sportId: 'sport-1',
      categoryId: 'cat-1',
      type: 'OPEN',
      status: 'OPEN',
      scheduledAt: DateTime(2024, 6, 1, 10),
      pricePerPlayerCents: 0,
      maxParticipants: 4,
      participantCount: 1,
      openSpots: 3,
      courtId: 'court-1',
      clubName: null,
      courtName: null,
      locationLabel: null,
      tournamentId: null,
      participants: const [],
      createdAt: DateTime(2024),
      updatedAt: DateTime(2024),
      affectsElo: true,
    );

Map<String, Object?> _availabilityEnvelope({
  String courtId = 'court-1',
  List<String> slots = const ['2024-06-01T10:00:00.000Z'],
}) =>
    {
      'venueId': 'venue-1',
      'courts': [
        {
          'courtId': courtId,
          'slots': slots
              .map((s) => {'scheduledAt': s, 'isAvailable': true})
              .toList(),
        },
      ],
    };


Map<String, Object?> _categoriesEnvelope() => {
      'categories': [
        {
          'id': 'cat-1',
          'sportId': 'sport-1',
          'name': 'Primera',
          'slug': 'primera',
          'scheme': 'TIERED',
          'sortOrder': 1,
        },
      ],
    };

// ---------------------------------------------------------------------------
// Builder helpers
// ---------------------------------------------------------------------------

({
  _MockVenuesRepository venuesRepo,
  _MockMatchesRepository matchesRepo,
  _MockCatalogApi catalogApi,
  CatalogRepository catalogRepo,
}) _mocks() {
  final venuesRepo = _MockVenuesRepository();
  final matchesRepo = _MockMatchesRepository();
  final catalogApi = _MockCatalogApi();
  final catalogRepo = CatalogRepository(catalogApi: catalogApi);
  return (
    venuesRepo: venuesRepo,
    matchesRepo: matchesRepo,
    catalogApi: catalogApi,
    catalogRepo: catalogRepo,
  );
}

VenueBookingCubit _buildCubit({
  VenueDto? venue,
  _MockVenuesRepository? venuesRepo,
  _MockMatchesRepository? matchesRepo,
  CatalogRepository? catalogRepo,
}) {
  final m = _mocks();
  return VenueBookingCubit(
    venue: venue ?? _venue(),
    venuesRepository: venuesRepo ?? m.venuesRepo,
    matchesRepository: matchesRepo ?? m.matchesRepo,
    catalogRepository: catalogRepo ?? m.catalogRepo,
  );
}

void main() {
  late _MockVenuesRepository venuesRepo;
  late _MockMatchesRepository matchesRepo;
  late _MockCatalogApi catalogApi;
  late CatalogRepository catalogRepo;

  setUp(() {
    final m = _mocks();
    venuesRepo = m.venuesRepo;
    matchesRepo = m.matchesRepo;
    catalogApi = m.catalogApi;
    catalogRepo = m.catalogRepo;

    registerFallbackValue(DateTime(2024));
  });

  // ──────────────────────────────────────────────────────────────────────────
  // load() — success
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    'load() — fetches courts + categories in parallel, emits loaded',
    build: () {
      when(() => matchesRepo.resolveDefaultSportId())
          .thenAnswer((_) async => 'sport-1');
      when(() => venuesRepo.listVenueCourts(
            venueId: any(named: 'venueId'),
            status: any(named: 'status'),
          )).thenAnswer((_) async => [_court()]);
      when(() => catalogApi.listCategoriesEnvelope(sportId: any(named: 'sportId')))
          .thenAnswer((_) async => _categoriesEnvelope());

      return VenueBookingCubit(
        venue: _venue(),
        venuesRepository: venuesRepo,
        matchesRepository: matchesRepo,
        catalogRepository: catalogRepo,
      );
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      isA<VenueBookingState>().having((s) => s.loading, 'loading=true', true),
      isA<VenueBookingState>()
          .having((s) => s.loading, 'loading=false', false)
          .having((s) => s.courts.length, 'courts', 1)
          .having((s) => s.categories.length, 'categories', 1)
          .having((s) => s.sportId, 'sportId resolved', 'sport-1')
          .having(
              (s) => s.selectedCategoryId, 'first category auto-selected', 'cat-1'),
    ],
  );

  // ──────────────────────────────────────────────────────────────────────────
  // load() — AppFailure → emits error
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    'load() — AppFailure → emits loading=false with error message',
    build: () {
      when(() => matchesRepo.resolveDefaultSportId()).thenThrow(
        const AppFailure(code: 'ERR', message: 'Sin deportes.'),
      );
      when(() => venuesRepo.listVenueCourts(
            venueId: any(named: 'venueId'),
            status: any(named: 'status'),
          )).thenAnswer((_) async => []);
      when(() => catalogApi.listCategoriesEnvelope(sportId: any(named: 'sportId')))
          .thenAnswer((_) async => _categoriesEnvelope());

      return VenueBookingCubit(
        venue: _venue(),
        venuesRepository: venuesRepo,
        matchesRepository: matchesRepo,
        catalogRepository: catalogRepo,
      );
    },
    act: (cubit) => cubit.load(),
    expect: () => [
      isA<VenueBookingState>().having((s) => s.loading, 'loading=true', true),
      isA<VenueBookingState>()
          .having((s) => s.loading, 'loading=false', false)
          .having((s) => s.error, 'error set', isNotNull),
    ],
  );

  // ──────────────────────────────────────────────────────────────────────────
  // selectDate()
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    'selectDate() — resets selectedSlot and slotsByCourtId, emits new date',
    build: () => _buildCubit(),
    seed: () => VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024, 6, 1),
      selectedSlot: '2024-06-01T10:00:00.000Z',
      slotsByCourtId: const {'court-1': ['2024-06-01T10:00:00.000Z']},
    ),
    act: (cubit) => cubit.selectDate(DateTime(2024, 6, 2)),
    expect: () => [
      isA<VenueBookingState>()
          .having((s) => s.selectedDate.day, 'new date day', 2)
          .having((s) => s.selectedSlot, 'slot reset', isNull)
          .having((s) => s.slotsByCourtId.isEmpty, 'slots cache cleared', true),
    ],
  );

  // ──────────────────────────────────────────────────────────────────────────
  // selectCourt() — sets selectedCourtId, resets selectedSlot (sync emit)
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    'selectCourt() — sets selectedCourtId, resets selectedSlot',
    build: () {
      when(() => venuesRepo.getVenueAvailability(
            venueId: any(named: 'venueId'),
            from: any(named: 'from'),
            to: any(named: 'to'),
            courtId: any(named: 'courtId'),
            durationMinutes: any(named: 'durationMinutes'),
            sportId: any(named: 'sportId'),
            categoryId: any(named: 'categoryId'),
          )).thenAnswer((_) async => _availabilityEnvelope());
      return VenueBookingCubit(
        venue: _venue(),
        venuesRepository: venuesRepo,
        matchesRepository: matchesRepo,
        catalogRepository: catalogRepo,
      );
    },
    seed: () => VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024, 6, 1),
      selectedCourtId: 'court-old',
      selectedSlot: '2024-06-01T10:00:00.000Z',
      courts: [_court()],
    ),
    act: (cubit) => cubit.selectCourt('court-1'),
    expect: () => [
      // First sync emit: court set + slot reset + loading
      isA<VenueBookingState>()
          .having((s) => s.selectedCourtId, 'court set', 'court-1')
          .having((s) => s.selectedSlot, 'slot reset', isNull),
      // Second emit after availability fetch
      isA<VenueBookingState>()
          .having((s) => s.slotsLoadingCourtId, 'loading done', isNull),
    ],
  );

  // ──────────────────────────────────────────────────────────────────────────
  // selectCourt() — triggers getVenueAvailability → slotsByCourtId updated
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    'selectCourt() — triggers availability fetch, populates slotsByCourtId',
    build: () {
      when(() => venuesRepo.getVenueAvailability(
            venueId: any(named: 'venueId'),
            from: any(named: 'from'),
            to: any(named: 'to'),
            courtId: any(named: 'courtId'),
            durationMinutes: any(named: 'durationMinutes'),
            sportId: any(named: 'sportId'),
            categoryId: any(named: 'categoryId'),
          )).thenAnswer((_) async => _availabilityEnvelope());

      return VenueBookingCubit(
        venue: _venue(),
        venuesRepository: venuesRepo,
        matchesRepository: matchesRepo,
        catalogRepository: catalogRepo,
      );
    },
    seed: () => VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024, 6, 1),
      courts: [_court()],
      sportId: 'sport-1',
    ),
    act: (cubit) => cubit.selectCourt('court-1'),
    expect: () => [
      // First: selectedCourt set + slot reset + slotsLoadingCourtId set
      isA<VenueBookingState>()
          .having((s) => s.selectedCourtId, 'court set', 'court-1')
          .having((s) => s.selectedSlot, 'slot reset', isNull)
          .having((s) => s.slotsLoadingCourtId, 'loading court', 'court-1'),
      // Then: slots loaded
      isA<VenueBookingState>()
          .having((s) => s.slotsLoadingCourtId, 'loading done', isNull)
          .having(
              (s) => s.slotsByCourtId.containsKey('court-1'), 'has slots', true)
          .having(
              (s) => s.slotsByCourtId['court-1']!.length, 'slot count', 1),
    ],
  );

  // ──────────────────────────────────────────────────────────────────────────
  // selectSlot()
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    'selectSlot() — emits state with selectedSlot set',
    build: () => _buildCubit(),
    seed: () => VenueBookingState(venue: _venue(), selectedDate: DateTime(2024)),
    act: (cubit) => cubit.selectSlot('2024-06-01T10:00:00.000Z'),
    expect: () => [
      isA<VenueBookingState>()
          .having((s) => s.selectedSlot, 'slot set', '2024-06-01T10:00:00.000Z'),
    ],
  );

  // ──────────────────────────────────────────────────────────────────────────
  // selectCategory()
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    'selectCategory() — emits state with selectedCategoryId set',
    build: () => _buildCubit(),
    seed: () => VenueBookingState(venue: _venue(), selectedDate: DateTime(2024)),
    act: (cubit) => cubit.selectCategory('cat-2'),
    expect: () => [
      isA<VenueBookingState>()
          .having((s) => s.selectedCategoryId, 'category set', 'cat-2'),
    ],
  );

  // ──────────────────────────────────────────────────────────────────────────
  // setAffectsElo()
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    'setAffectsElo(false) — emits state with affectsElo=false',
    build: () => _buildCubit(),
    seed: () => VenueBookingState(
        venue: _venue(), selectedDate: DateTime(2024), affectsElo: true),
    act: (cubit) => cubit.setAffectsElo(false),
    expect: () => [
      isA<VenueBookingState>().having((s) => s.affectsElo, 'affectsElo', false),
    ],
  );

  // ──────────────────────────────────────────────────────────────────────────
  // setGender()
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    "setGender('FEMALE') — emits state with gender='FEMALE'",
    build: () => _buildCubit(),
    seed: () => VenueBookingState(venue: _venue(), selectedDate: DateTime(2024)),
    act: (cubit) => cubit.setGender('FEMALE'),
    expect: () => [
      isA<VenueBookingState>().having((s) => s.gender, 'gender', 'FEMALE'),
    ],
  );

  blocTest<VenueBookingCubit, VenueBookingState>(
    'setGender(null) — clears gender via sentinel',
    build: () => _buildCubit(),
    seed: () => VenueBookingState(
        venue: _venue(), selectedDate: DateTime(2024), gender: 'MALE'),
    act: (cubit) => cubit.setGender(null),
    expect: () => [
      isA<VenueBookingState>().having((s) => s.gender, 'gender null', isNull),
    ],
  );

  // ──────────────────────────────────────────────────────────────────────────
  // setMaxParticipants()
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    'setMaxParticipants(2) — emits with maxParticipants=2',
    build: () => _buildCubit(),
    seed: () => VenueBookingState(venue: _venue(), selectedDate: DateTime(2024)),
    act: (cubit) => cubit.setMaxParticipants(2),
    expect: () => [
      isA<VenueBookingState>()
          .having((s) => s.maxParticipants, 'maxParticipants', 2),
    ],
  );

  // ──────────────────────────────────────────────────────────────────────────
  // setNotes()
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    "setNotes('hello') — emits with notes='hello'",
    build: () => _buildCubit(),
    seed: () => VenueBookingState(venue: _venue(), selectedDate: DateTime(2024)),
    act: (cubit) => cubit.setNotes('hello'),
    expect: () => [
      isA<VenueBookingState>().having((s) => s.notes, 'notes', 'hello'),
    ],
  );

  // ──────────────────────────────────────────────────────────────────────────
  // canSubmit
  // ──────────────────────────────────────────────────────────────────────────

  test('canSubmit — false when missing required fields', () {
    final state = VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024),
      selectedCourtId: 'court-1',
      gender: 'MALE',
      // missing selectedSlot and selectedCategoryId
    );
    expect(state.canSubmit, isFalse);
  });

  test('canSubmit — false when gender is null', () {
    final state = VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024),
      selectedCourtId: 'court-1',
      selectedSlot: '2024-06-01T10:00:00.000Z',
      selectedCategoryId: 'cat-1',
      gender: null,
    );
    expect(state.canSubmit, isFalse);
  });

  test('canSubmit — true when all required fields set', () {
    final state = VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024),
      selectedCourtId: 'court-1',
      selectedSlot: '2024-06-01T10:00:00.000Z',
      selectedCategoryId: 'cat-1',
      gender: 'MALE',
    );
    expect(state.canSubmit, isTrue);
  });

  test('canSubmit — false when submitting=true', () {
    final state = VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024),
      selectedCourtId: 'court-1',
      selectedSlot: '2024-06-01T10:00:00.000Z',
      selectedCategoryId: 'cat-1',
      gender: 'MALE',
      submitting: true,
    );
    expect(state.canSubmit, isFalse);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // submit() — success
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    'submit() — calls createMatch with correct args, emits submittedMatchId',
    build: () {
      when(() => matchesRepo.createMatch(
            sportId: any(named: 'sportId'),
            categoryId: any(named: 'categoryId'),
            type: any(named: 'type'),
            courtId: any(named: 'courtId'),
            venueId: any(named: 'venueId'),
            scheduledAt: any(named: 'scheduledAt'),
            maxParticipants: any(named: 'maxParticipants'),
            pricePerPlayerCents: any(named: 'pricePerPlayerCents'),
            durationMinutes: any(named: 'durationMinutes'),
            notes: any(named: 'notes'),
            affectsElo: any(named: 'affectsElo'),
            gender: any(named: 'gender'),
          )).thenAnswer((_) async => _matchDetail(id: 'new-match-1'));

      return VenueBookingCubit(
        venue: _venue(),
        venuesRepository: venuesRepo,
        matchesRepository: matchesRepo,
        catalogRepository: catalogRepo,
      );
    },
    seed: () => VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024, 6, 1),
      selectedCourtId: 'court-1',
      selectedSlot: '2024-06-01T10:00:00.000Z',
      selectedCategoryId: 'cat-1',
      courts: [_court()],
      sportId: 'sport-1',
      maxParticipants: 4,
      affectsElo: true,
      gender: 'MALE',
    ),
    act: (cubit) => cubit.submit(),
    expect: () => [
      isA<VenueBookingState>()
          .having((s) => s.submitting, 'submitting=true', true),
      isA<VenueBookingState>()
          .having((s) => s.submitting, 'submitting=false', false)
          .having((s) => s.submittedMatchId, 'matchId emitted', 'new-match-1'),
    ],
    verify: (_) {
      verify(() => matchesRepo.createMatch(
            sportId: 'sport-1',
            categoryId: 'cat-1',
            type: 'OPEN',
            courtId: 'court-1',
            venueId: 'venue-1',
            scheduledAt: any(named: 'scheduledAt'),
            maxParticipants: 4,
            pricePerPlayerCents: any(named: 'pricePerPlayerCents'),
            durationMinutes: 90,
            notes: any(named: 'notes'),
            affectsElo: true,
            gender: 'MALE',
          )).called(1);
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // submit() — guard when canSubmit=false
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    'submit() — guards when canSubmit=false, no call to createMatch',
    build: () {
      return VenueBookingCubit(
        venue: _venue(),
        venuesRepository: venuesRepo,
        matchesRepository: matchesRepo,
        catalogRepository: catalogRepo,
      );
    },
    seed: () => VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024),
      // Missing selectedSlot and selectedCategoryId → canSubmit=false
    ),
    act: (cubit) => cubit.submit(),
    expect: () => [],
    verify: (_) {
      verifyNever(() => matchesRepo.createMatch(
            sportId: any(named: 'sportId'),
            categoryId: any(named: 'categoryId'),
          ));
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // submit() — AppFailure → error state
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    'submit() — AppFailure → emits submitting=false with error',
    build: () {
      when(() => matchesRepo.createMatch(
            sportId: any(named: 'sportId'),
            categoryId: any(named: 'categoryId'),
            type: any(named: 'type'),
            courtId: any(named: 'courtId'),
            venueId: any(named: 'venueId'),
            scheduledAt: any(named: 'scheduledAt'),
            maxParticipants: any(named: 'maxParticipants'),
            pricePerPlayerCents: any(named: 'pricePerPlayerCents'),
            durationMinutes: any(named: 'durationMinutes'),
            notes: any(named: 'notes'),
            affectsElo: any(named: 'affectsElo'),
            gender: any(named: 'gender'),
          )).thenThrow(
        const AppFailure(code: 'ERR', message: 'Error al crear el partido.'),
      );

      return VenueBookingCubit(
        venue: _venue(),
        venuesRepository: venuesRepo,
        matchesRepository: matchesRepo,
        catalogRepository: catalogRepo,
      );
    },
    seed: () => VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024, 6, 1),
      selectedCourtId: 'court-1',
      selectedSlot: '2024-06-01T10:00:00.000Z',
      selectedCategoryId: 'cat-1',
      courts: [_court()],
      sportId: 'sport-1',
      maxParticipants: 4,
      affectsElo: true,
      gender: 'MALE',
    ),
    act: (cubit) => cubit.submit(),
    expect: () => [
      isA<VenueBookingState>()
          .having((s) => s.submitting, 'submitting=true', true),
      isA<VenueBookingState>()
          .having((s) => s.submitting, 'submitting=false', false)
          .having((s) => s.error, 'error set', 'Error al crear el partido.')
          .having((s) => s.submittedMatchId, 'no matchId', isNull),
    ],
  );

  // ──────────────────────────────────────────────────────────────────────────
  // selectCourt() — taxonomy (sportId + categoryId) ambos-o-ninguno
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    'should send both sportId and categoryId in the availability request '
    'when selectedCategoryId is not null',
    build: () {
      when(() => venuesRepo.getVenueAvailability(
            venueId: any(named: 'venueId'),
            from: any(named: 'from'),
            to: any(named: 'to'),
            courtId: any(named: 'courtId'),
            durationMinutes: any(named: 'durationMinutes'),
            sportId: any(named: 'sportId'),
            categoryId: any(named: 'categoryId'),
          )).thenAnswer((_) async => _availabilityEnvelope());

      return VenueBookingCubit(
        venue: _venue(),
        venuesRepository: venuesRepo,
        matchesRepository: matchesRepo,
        catalogRepository: catalogRepo,
      );
    },
    seed: () => VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024, 6, 1),
      courts: [_court()],
      sportId: 'sport-1',
      selectedCategoryId: 'cat-1',
    ),
    act: (cubit) => cubit.selectCourt('court-1'),
    verify: (_) {
      verify(() => venuesRepo.getVenueAvailability(
            venueId: any(named: 'venueId'),
            from: any(named: 'from'),
            to: any(named: 'to'),
            courtId: any(named: 'courtId'),
            durationMinutes: any(named: 'durationMinutes'),
            sportId: 'sport-1',
            categoryId: 'cat-1',
          )).called(1);
    },
  );

  blocTest<VenueBookingCubit, VenueBookingState>(
    'should omit both sportId and categoryId when selectedCategoryId is null',
    build: () {
      when(() => venuesRepo.getVenueAvailability(
            venueId: any(named: 'venueId'),
            from: any(named: 'from'),
            to: any(named: 'to'),
            courtId: any(named: 'courtId'),
            durationMinutes: any(named: 'durationMinutes'),
            sportId: any(named: 'sportId'),
            categoryId: any(named: 'categoryId'),
          )).thenAnswer((_) async => _availabilityEnvelope());

      return VenueBookingCubit(
        venue: _venue(),
        venuesRepository: venuesRepo,
        matchesRepository: matchesRepo,
        catalogRepository: catalogRepo,
      );
    },
    seed: () => VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024, 6, 1),
      courts: [_court()],
      sportId: 'sport-1',
      // selectedCategoryId omitido → debe omitir AMBOS
    ),
    act: (cubit) => cubit.selectCourt('court-1'),
    verify: (_) {
      verify(() => venuesRepo.getVenueAvailability(
            venueId: any(named: 'venueId'),
            from: any(named: 'from'),
            to: any(named: 'to'),
            courtId: any(named: 'courtId'),
            durationMinutes: any(named: 'durationMinutes'),
            sportId: null,
            categoryId: null,
          )).called(1);
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // selectCourt() — error no silencioso (400 / 500) → slotsErrorByCourtId
  // ──────────────────────────────────────────────────────────────────────────

  blocTest<VenueBookingCubit, VenueBookingState>(
    'should expose a per-court error and clear slotsLoadingCourtId '
    'when the API returns 400',
    build: () {
      when(() => venuesRepo.getVenueAvailability(
            venueId: any(named: 'venueId'),
            from: any(named: 'from'),
            to: any(named: 'to'),
            courtId: any(named: 'courtId'),
            durationMinutes: any(named: 'durationMinutes'),
            sportId: any(named: 'sportId'),
            categoryId: any(named: 'categoryId'),
          )).thenThrow(
        const AppFailure(code: 'HTTP_400', message: 'Solicitud inválida.'),
      );

      return VenueBookingCubit(
        venue: _venue(),
        venuesRepository: venuesRepo,
        matchesRepository: matchesRepo,
        catalogRepository: catalogRepo,
      );
    },
    seed: () => VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024, 6, 1),
      courts: [_court()],
      sportId: 'sport-1',
      selectedCategoryId: 'cat-1',
    ),
    act: (cubit) => cubit.selectCourt('court-1'),
    expect: () => [
      isA<VenueBookingState>()
          .having((s) => s.slotsLoadingCourtId, 'loading court', 'court-1'),
      isA<VenueBookingState>()
          .having((s) => s.slotsLoadingCourtId, 'loading done', isNull)
          .having(
            (s) => s.slotsErrorByCourtId['court-1'],
            'per-court error set',
            'Solicitud inválida.',
          ),
    ],
  );

  blocTest<VenueBookingCubit, VenueBookingState>(
    'should expose a per-court error and clear slotsLoadingCourtId '
    'when the API returns 500',
    build: () {
      when(() => venuesRepo.getVenueAvailability(
            venueId: any(named: 'venueId'),
            from: any(named: 'from'),
            to: any(named: 'to'),
            courtId: any(named: 'courtId'),
            durationMinutes: any(named: 'durationMinutes'),
            sportId: any(named: 'sportId'),
            categoryId: any(named: 'categoryId'),
          )).thenThrow(
        const AppFailure(code: 'HTTP_500', message: 'Error del servidor.'),
      );

      return VenueBookingCubit(
        venue: _venue(),
        venuesRepository: venuesRepo,
        matchesRepository: matchesRepo,
        catalogRepository: catalogRepo,
      );
    },
    seed: () => VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024, 6, 1),
      courts: [_court()],
      sportId: 'sport-1',
      selectedCategoryId: 'cat-1',
    ),
    act: (cubit) => cubit.selectCourt('court-1'),
    expect: () => [
      isA<VenueBookingState>()
          .having((s) => s.slotsLoadingCourtId, 'loading court', 'court-1'),
      isA<VenueBookingState>()
          .having((s) => s.slotsLoadingCourtId, 'loading done', isNull)
          .having(
            (s) => s.slotsErrorByCourtId['court-1'],
            'per-court error set',
            'Error del servidor.',
          ),
    ],
  );

  blocTest<VenueBookingCubit, VenueBookingState>(
    'should not swallow the failure silently when availability fetch throws '
    'a generic error',
    build: () {
      when(() => venuesRepo.getVenueAvailability(
            venueId: any(named: 'venueId'),
            from: any(named: 'from'),
            to: any(named: 'to'),
            courtId: any(named: 'courtId'),
            durationMinutes: any(named: 'durationMinutes'),
            sportId: any(named: 'sportId'),
            categoryId: any(named: 'categoryId'),
          )).thenThrow(Exception('boom'));

      return VenueBookingCubit(
        venue: _venue(),
        venuesRepository: venuesRepo,
        matchesRepository: matchesRepo,
        catalogRepository: catalogRepo,
      );
    },
    seed: () => VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024, 6, 1),
      courts: [_court()],
      sportId: 'sport-1',
      selectedCategoryId: 'cat-1',
    ),
    act: (cubit) => cubit.selectCourt('court-1'),
    expect: () => [
      isA<VenueBookingState>()
          .having((s) => s.slotsLoadingCourtId, 'loading court', 'court-1'),
      isA<VenueBookingState>()
          .having((s) => s.slotsLoadingCourtId, 'loading done', isNull)
          .having(
            (s) => s.slotsErrorByCourtId.containsKey('court-1'),
            'per-court error present',
            true,
          ),
    ],
  );

  blocTest<VenueBookingCubit, VenueBookingState>(
    'should clear the previous per-court error when a subsequent fetch succeeds',
    build: () {
      when(() => venuesRepo.getVenueAvailability(
            venueId: any(named: 'venueId'),
            from: any(named: 'from'),
            to: any(named: 'to'),
            courtId: any(named: 'courtId'),
            durationMinutes: any(named: 'durationMinutes'),
            sportId: any(named: 'sportId'),
            categoryId: any(named: 'categoryId'),
          )).thenAnswer((_) async => _availabilityEnvelope());

      return VenueBookingCubit(
        venue: _venue(),
        venuesRepository: venuesRepo,
        matchesRepository: matchesRepo,
        catalogRepository: catalogRepo,
      );
    },
    seed: () => VenueBookingState(
      venue: _venue(),
      selectedDate: DateTime(2024, 6, 1),
      courts: [_court()],
      sportId: 'sport-1',
      selectedCategoryId: 'cat-1',
      slotsErrorByCourtId: const {'court-1': 'error previo'},
    ),
    act: (cubit) => cubit.selectCourt('court-1'),
    expect: () => [
      isA<VenueBookingState>()
          .having((s) => s.slotsLoadingCourtId, 'loading court', 'court-1'),
      isA<VenueBookingState>()
          .having((s) => s.slotsLoadingCourtId, 'loading done', isNull)
          .having(
            (s) => s.slotsErrorByCourtId.containsKey('court-1'),
            'previous error cleared',
            false,
          )
          .having(
            (s) => s.slotsByCourtId.containsKey('court-1'),
            'slots loaded',
            true,
          ),
    ],
  );
}
