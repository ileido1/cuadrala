import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/core/location/location_service.dart';
import 'package:cuadrala_mobile/src/core/storage/saved_zones_repository.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/venue_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/data/venues_repository.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_map_cubit.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_map_state.dart';

class _MockVenuesRepository extends Mock implements VenuesRepository {}

class _MockLocationService extends Mock implements LocationService {}

class _MockSavedZonesRepository extends Mock implements SavedZonesRepository {}

VenueDto _venue({
  String id = 'v1',
  String name = 'Club Padel Norte',
  String? address = 'Av. Corrientes 1234',
  double? latitude = -34.6,
  double? longitude = -58.4,
}) =>
    VenueDto(
      id: id,
      name: name,
      address: address,
      latitude: latitude,
      longitude: longitude,
    );

void main() {
  group('VenueMapCubit', () {
    late _MockVenuesRepository repository;
    late _MockLocationService locationService;
    late _MockSavedZonesRepository zonesRepository;

    setUp(() {
      repository = _MockVenuesRepository();
      locationService = _MockLocationService();
      zonesRepository = _MockSavedZonesRepository();
      // Default: listZones returns empty, no-op
      when(() => zonesRepository.listZones()).thenAnswer((_) async => []);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // load() — GPS granted
    // ──────────────────────────────────────────────────────────────────────────

    blocTest<VenueMapCubit, VenueMapState>(
      'load() — GPS granted → emits [loading, loaded] with userLat/userLng set',
      build: () {
        when(() => locationService.getCurrentLocation()).thenAnswer(
          (_) async => const DeviceLocation(latitude: -34.6, longitude: -58.4),
        );
        when(
          () => repository.listVenues(
            near: any(named: 'near'),
            radiusKm: any(named: 'radiusKm'),
          ),
        ).thenAnswer((_) async => [_venue()]);
        return VenueMapCubit(
          repository: repository,
          locationService: locationService,
          zonesRepository: zonesRepository,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loading),
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loaded)
            .having((s) => s.userLat, 'userLat', -34.6)
            .having((s) => s.userLng, 'userLng', -58.4)
            .having((s) => s.venues.length, 'venues count', 1)
            .having((s) => s.fellBackToAll, 'fellBackToAll', false),
      ],
      verify: (_) {
        verify(
          () => repository.listVenues(near: '-34.6,-58.4', radiusKm: 25),
        ).called(1);
        verifyNever(() => repository.listVenues());
      },
    );

    // ──────────────────────────────────────────────────────────────────────────
    // load() — GPS granted but near-query empty → fallback to flat list
    // ──────────────────────────────────────────────────────────────────────────

    blocTest<VenueMapCubit, VenueMapState>(
      'load() — GPS granted, near-query empty → retries without near, '
      'fellBackToAll=true, listVenues called twice, coords preserved',
      build: () {
        when(() => locationService.getCurrentLocation()).thenAnswer(
          (_) async => const DeviceLocation(latitude: -34.6, longitude: -58.4),
        );
        // Near-query (con coords) → vacía.
        when(
          () => repository.listVenues(near: '-34.6,-58.4', radiusKm: 25),
        ).thenAnswer((_) async => const <VenueDto>[]);
        // Fallback sin near → lista completa.
        when(() => repository.listVenues())
            .thenAnswer((_) async => [_venue(id: 'far-away')]);
        return VenueMapCubit(
          repository: repository,
          locationService: locationService,
          zonesRepository: zonesRepository,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loading)
            .having((s) => s.fellBackToAll, 'reset on loading', false),
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loaded)
            .having((s) => s.venues.length, 'flat list', 1)
            .having((s) => s.venues.first.id, 'fallback venue', 'far-away')
            .having((s) => s.fellBackToAll, 'fellBackToAll', true)
            .having((s) => s.userLat, 'coords preserved', -34.6)
            .having((s) => s.userLng, 'coords preserved', -58.4),
      ],
      verify: (_) {
        verify(
          () => repository.listVenues(near: '-34.6,-58.4', radiusKm: 25),
        ).called(1);
        verify(() => repository.listVenues()).called(1);
      },
    );

    blocTest<VenueMapCubit, VenueMapState>(
      'load() — GPS granted, near-query empty AND fallback empty → '
      'loaded empty, fellBackToAll=true, no crash',
      build: () {
        when(() => locationService.getCurrentLocation()).thenAnswer(
          (_) async => const DeviceLocation(latitude: -34.6, longitude: -58.4),
        );
        when(
          () => repository.listVenues(near: '-34.6,-58.4', radiusKm: 25),
        ).thenAnswer((_) async => const <VenueDto>[]);
        when(() => repository.listVenues())
            .thenAnswer((_) async => const <VenueDto>[]);
        return VenueMapCubit(
          repository: repository,
          locationService: locationService,
          zonesRepository: zonesRepository,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loading),
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loaded)
            .having((s) => s.filtered.length, 'empty', 0)
            .having((s) => s.fellBackToAll, 'fellBackToAll', true),
      ],
    );

    blocTest<VenueMapCubit, VenueMapState>(
      'load() — GPS granted, near-query empty, fallback throws → failure, '
      'no extra retry',
      build: () {
        when(() => locationService.getCurrentLocation()).thenAnswer(
          (_) async => const DeviceLocation(latitude: -34.6, longitude: -58.4),
        );
        when(
          () => repository.listVenues(near: '-34.6,-58.4', radiusKm: 25),
        ).thenAnswer((_) async => const <VenueDto>[]);
        when(() => repository.listVenues()).thenThrow(
          const AppFailure(code: 'NETWORK_ERROR', message: 'Sin conexión.'),
        );
        return VenueMapCubit(
          repository: repository,
          locationService: locationService,
          zonesRepository: zonesRepository,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loading),
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.failure)
            .having((s) => s.error, 'error message', 'Sin conexión.'),
      ],
      verify: (_) {
        verify(() => repository.listVenues()).called(1);
      },
    );

    // ──────────────────────────────────────────────────────────────────────────
    // load() — GPS denied → fallback (no near), loaded with null coords
    // ──────────────────────────────────────────────────────────────────────────

    blocTest<VenueMapCubit, VenueMapState>(
      'load() — GPS denied (LocationFailure) → emits [loading, loaded] with null coords',
      build: () {
        when(() => locationService.getCurrentLocation()).thenThrow(
          const LocationFailure(code: 'LOCATION_DENIED', message: 'Permiso denegado'),
        );
        when(
          () => repository.listVenues(
            near: any(named: 'near'),
            radiusKm: any(named: 'radiusKm'),
          ),
        ).thenAnswer((_) async => [_venue()]);
        when(() => repository.listVenues()).thenAnswer((_) async => [_venue()]);
        return VenueMapCubit(
          repository: repository,
          locationService: locationService,
          zonesRepository: zonesRepository,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loading),
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loaded)
            .having((s) => s.userLat, 'userLat', isNull)
            .having((s) => s.userLng, 'userLng', isNull)
            .having((s) => s.fellBackToAll, 'fellBackToAll', false),
      ],
      verify: (_) {
        verify(() => repository.listVenues()).called(1);
      },
    );

    // ──────────────────────────────────────────────────────────────────────────
    // load() — venues with null lat or null lng → excluded from state
    // ──────────────────────────────────────────────────────────────────────────

    blocTest<VenueMapCubit, VenueMapState>(
      'load() — venues with null lat OR null lng → excluded from venues and filtered',
      build: () {
        when(() => locationService.getCurrentLocation()).thenThrow(
          const LocationFailure(code: 'LOCATION_DENIED', message: 'x'),
        );
        when(() => repository.listVenues()).thenAnswer(
          (_) async => [
            _venue(id: 'v1', latitude: -34.6, longitude: -58.4),
            _venue(id: 'v2', latitude: null, longitude: -58.4),
            _venue(id: 'v3', latitude: -34.6, longitude: null),
            _venue(id: 'v4', latitude: null, longitude: null),
          ],
        );
        return VenueMapCubit(
          repository: repository,
          locationService: locationService,
          zonesRepository: zonesRepository,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loading),
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loaded)
            .having((s) => s.venues.length, 'only v1 kept', 1)
            .having((s) => s.filtered.length, 'filtered also 1', 1)
            .having((s) => s.venues.first.id, 'correct venue', 'v1'),
      ],
    );

    // ──────────────────────────────────────────────────────────────────────────
    // load() — API AppFailure → failure state
    // ──────────────────────────────────────────────────────────────────────────

    blocTest<VenueMapCubit, VenueMapState>(
      'load() — API AppFailure → emits [loading, failure] with error message',
      build: () {
        when(() => locationService.getCurrentLocation()).thenThrow(
          const LocationFailure(code: 'LOCATION_DENIED', message: 'x'),
        );
        when(() => repository.listVenues()).thenThrow(
          const AppFailure(code: 'NETWORK_ERROR', message: 'Sin conexión.'),
        );
        return VenueMapCubit(
          repository: repository,
          locationService: locationService,
          zonesRepository: zonesRepository,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loading),
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.failure)
            .having((s) => s.error, 'error message', 'Sin conexión.'),
      ],
    );

    // ──────────────────────────────────────────────────────────────────────────
    // search()
    // ──────────────────────────────────────────────────────────────────────────

    blocTest<VenueMapCubit, VenueMapState>(
      "search('club') — case-insensitive name match → state.filtered contains matching venues only",
      build: () {
        when(() => locationService.getCurrentLocation()).thenThrow(
          const LocationFailure(code: 'LOCATION_DENIED', message: 'x'),
        );
        when(() => repository.listVenues()).thenAnswer(
          (_) async => [
            _venue(id: 'v1', name: 'Club Norte'),
            _venue(id: 'v2', name: 'Padel Sur'),
          ],
        );
        return VenueMapCubit(
          repository: repository,
          locationService: locationService,
          zonesRepository: zonesRepository,
        );
      },
      act: (cubit) async {
        await cubit.load();
        cubit.search('CLUB');
      },
      expect: () => [
        isA<VenueMapState>().having((s) => s.status, 'loading', VenueMapStatus.loading),
        isA<VenueMapState>()
            .having((s) => s.status, 'loaded', VenueMapStatus.loaded)
            .having((s) => s.filtered.length, 'all 2', 2),
        isA<VenueMapState>()
            .having((s) => s.filtered.length, 'only 1 matches', 1)
            .having((s) => s.filtered.first.id, 'correct venue', 'v1')
            .having((s) => s.searchQuery, 'query stored', 'CLUB'),
      ],
    );

    blocTest<VenueMapCubit, VenueMapState>(
      "search('') — empty query → state.filtered == state.venues (full reset)",
      build: () {
        when(() => locationService.getCurrentLocation()).thenThrow(
          const LocationFailure(code: 'LOCATION_DENIED', message: 'x'),
        );
        when(() => repository.listVenues()).thenAnswer(
          (_) async => [
            _venue(id: 'v1', name: 'Club Norte'),
            _venue(id: 'v2', name: 'Padel Sur'),
          ],
        );
        return VenueMapCubit(
          repository: repository,
          locationService: locationService,
          zonesRepository: zonesRepository,
        );
      },
      act: (cubit) async {
        await cubit.load();
        cubit.search('club');
        cubit.search('');
      },
      expect: () => [
        isA<VenueMapState>().having((s) => s.status, 'loading', VenueMapStatus.loading),
        isA<VenueMapState>().having((s) => s.filtered.length, 'all 2', 2),
        isA<VenueMapState>().having((s) => s.filtered.length, 'filtered 1', 1),
        isA<VenueMapState>()
            .having((s) => s.filtered.length, 'reset to 2', 2)
            .having((s) => s.searchQuery, 'query empty', ''),
      ],
    );

    blocTest<VenueMapCubit, VenueMapState>(
      "search('xyz') — no matches → state.filtered is empty",
      build: () {
        when(() => locationService.getCurrentLocation()).thenThrow(
          const LocationFailure(code: 'LOCATION_DENIED', message: 'x'),
        );
        when(() => repository.listVenues()).thenAnswer(
          (_) async => [
            _venue(id: 'v1', name: 'Club Norte'),
            _venue(id: 'v2', name: 'Padel Sur'),
          ],
        );
        return VenueMapCubit(
          repository: repository,
          locationService: locationService,
          zonesRepository: zonesRepository,
        );
      },
      act: (cubit) async {
        await cubit.load();
        cubit.search('xyz');
      },
      expect: () => [
        isA<VenueMapState>().having((s) => s.status, 'loading', VenueMapStatus.loading),
        isA<VenueMapState>().having((s) => s.filtered.length, 'all 2', 2),
        isA<VenueMapState>().having((s) => s.filtered.length, 'no matches', 0),
      ],
    );

    // ──────────────────────────────────────────────────────────────────────────
    // load() — sportType filter (Phase 3)
    // ──────────────────────────────────────────────────────────────────────────

    blocTest<VenueMapCubit, VenueMapState>(
      "load(sportType: 'PADEL') → pasa sportType al repository y emite sportType",
      build: () {
        when(() => locationService.getCurrentLocation()).thenAnswer(
          (_) async => const DeviceLocation(latitude: -34.6, longitude: -58.4),
        );
        when(
          () => repository.listVenues(
            near: any(named: 'near'),
            radiusKm: any(named: 'radiusKm'),
            sportType: any(named: 'sportType'),
          ),
        ).thenAnswer((_) async => [_venue()]);
        return VenueMapCubit(
          repository: repository,
          locationService: locationService,
          zonesRepository: zonesRepository,
        );
      },
      act: (cubit) => cubit.load(sportType: 'PADEL'),
      expect: () => [
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loading),
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loaded)
            .having((s) => s.sportType, 'sportType', 'PADEL'),
      ],
      verify: (_) {
        verify(
          () => repository.listVenues(
            near: '-34.6,-58.4',
            radiusKm: 25,
            sportType: 'PADEL',
          ),
        ).called(1);
      },
    );

    blocTest<VenueMapCubit, VenueMapState>(
      'load() sin sportType → preserva el filtro actual del estado',
      build: () {
        when(() => locationService.getCurrentLocation()).thenAnswer(
          (_) async => const DeviceLocation(latitude: -34.6, longitude: -58.4),
        );
        when(
          () => repository.listVenues(
            near: any(named: 'near'),
            radiusKm: any(named: 'radiusKm'),
            sportType: any(named: 'sportType'),
          ),
        ).thenAnswer((_) async => [_venue()]);
        return VenueMapCubit(
          repository: repository,
          locationService: locationService,
          zonesRepository: zonesRepository,
        );
      },
      seed: () => const VenueMapState(sportType: 'TENNIS'),
      act: (cubit) => cubit.load(),
      verify: (_) {
        verify(
          () => repository.listVenues(
            near: '-34.6,-58.4',
            radiusKm: 25,
            sportType: 'TENNIS',
          ),
        ).called(1);
      },
    );

    blocTest<VenueMapCubit, VenueMapState>(
      'load(sportType: null) → limpia el filtro (Todos)',
      build: () {
        when(() => locationService.getCurrentLocation()).thenAnswer(
          (_) async => const DeviceLocation(latitude: -34.6, longitude: -58.4),
        );
        when(
          () => repository.listVenues(
            near: any(named: 'near'),
            radiusKm: any(named: 'radiusKm'),
            sportType: any(named: 'sportType'),
          ),
        ).thenAnswer((_) async => [_venue()]);
        return VenueMapCubit(
          repository: repository,
          locationService: locationService,
          zonesRepository: zonesRepository,
        );
      },
      seed: () => const VenueMapState(sportType: 'PADEL'),
      act: (cubit) => cubit.load(sportType: null),
      expect: () => [
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loading),
        isA<VenueMapState>()
            .having((s) => s.status, 'status', VenueMapStatus.loaded)
            .having((s) => s.sportType, 'sportType', isNull),
      ],
      verify: (_) {
        final captured = verify(
          () => repository.listVenues(
            near: '-34.6,-58.4',
            radiusKm: 25,
            sportType: captureAny(named: 'sportType'),
          ),
        ).captured;
        expect(captured.single, isNull);
      },
    );

    // ──────────────────────────────────────────────────────────────────────────
    // selectVenue()
    // ──────────────────────────────────────────────────────────────────────────

    blocTest<VenueMapCubit, VenueMapState>(
      'selectVenue(venue) → state.selectedVenue == venue',
      build: () => VenueMapCubit(
        repository: repository,
        locationService: locationService,
        zonesRepository: zonesRepository,
      ),
      act: (cubit) => cubit.selectVenue(_venue()),
      expect: () => [
        isA<VenueMapState>()
            .having((s) => s.selectedVenue, 'selectedVenue set', isNotNull)
            .having((s) => s.selectedVenue?.id, 'correct id', 'v1'),
      ],
    );

    blocTest<VenueMapCubit, VenueMapState>(
      'selectVenue(null) → state.selectedVenue is null',
      build: () => VenueMapCubit(
        repository: repository,
        locationService: locationService,
        zonesRepository: zonesRepository,
      ),
      seed: () => VenueMapState(selectedVenue: _venue()),
      act: (cubit) => cubit.selectVenue(null),
      expect: () => [
        isA<VenueMapState>().having((s) => s.selectedVenue, 'selectedVenue null', isNull),
      ],
    );
  });
}
