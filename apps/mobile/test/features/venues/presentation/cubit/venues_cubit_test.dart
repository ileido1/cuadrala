import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/location/location_service.dart';
import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/venue_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/data/venues_repository.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venues_cubit.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venues_state.dart';

class _MockVenuesRepository extends Mock implements VenuesRepository {}

class _MockLocationService extends Mock implements LocationService {}

VenueDto _venue({String id = 'v1', double? distanceKm}) => VenueDto(
      id: id,
      name: 'Sede $id',
      address: 'Av. Corrientes 1234',
      latitude: -34.6,
      longitude: -58.4,
      distanceKm: distanceKm,
    );

void main() {
  group('VenuesCubit — GPS paths', () {
    late _MockVenuesRepository repository;
    late _MockLocationService locationService;

    setUp(() {
      repository = _MockVenuesRepository();
      locationService = _MockLocationService();
    });

    // =========================================================================
    // 2.2.1 RED — GPS success path
    // =========================================================================

    blocTest<VenuesCubit, VenuesState>(
      'loadWithGps: GPS granted → passes near coords to repository',
      build: () {
        when(() => locationService.getCurrentLocation()).thenAnswer(
          (_) async => const DeviceLocation(latitude: -34.6, longitude: -58.4),
        );
        when(
          () => repository.listVenues(
            near: any(named: 'near'),
            radiusKm: any(named: 'radiusKm'),
          ),
        ).thenAnswer((_) async => [_venue(distanceKm: 1.2)]);
        return VenuesCubit(
          repository: repository,
          locationService: locationService,
        );
      },
      act: (cubit) => cubit.loadWithGps(),
      expect: () => [
        const VenuesLoading(),
        isA<VenuesLoaded>()
            .having((s) => s.venues.length, 'venues.length', 1)
            .having((s) => s.userLat, 'userLat set', -34.6)
            .having((s) => s.userLng, 'userLng set', -58.4),
      ],
      verify: (_) {
        verify(
          () => repository.listVenues(
            near: '-34.6,-58.4',
            radiusKm: any(named: 'radiusKm'),
          ),
        ).called(1);
      },
    );

    blocTest<VenuesCubit, VenuesState>(
      'loadWithGps: GPS denied (LocationFailure) → falls back to listVenues without near',
      build: () {
        when(() => locationService.getCurrentLocation()).thenThrow(
          const LocationFailure(code: 'LOCATION_DENIED', message: 'Permiso denegado'),
        );
        when(
          () => repository.listVenues(),
        ).thenAnswer((_) async => [_venue()]);
        return VenuesCubit(
          repository: repository,
          locationService: locationService,
        );
      },
      act: (cubit) => cubit.loadWithGps(),
      expect: () => [
        const VenuesLoading(),
        isA<VenuesLoaded>()
            .having((s) => s.venues.length, 'venues.length', 1)
            .having((s) => s.userLat, 'userLat null on denial', null)
            .having((s) => s.userLng, 'userLng null on denial', null),
      ],
    );

    blocTest<VenuesCubit, VenuesState>(
      'loadWithGps: GPS denied forever → falls back gracefully',
      build: () {
        when(() => locationService.getCurrentLocation()).thenThrow(
          const LocationFailure(code: 'LOCATION_DENIED_FOREVER', message: 'Denegado permanente'),
        );
        when(() => repository.listVenues()).thenAnswer((_) async => [_venue()]);
        return VenuesCubit(
          repository: repository,
          locationService: locationService,
        );
      },
      act: (cubit) => cubit.loadWithGps(),
      expect: () => [
        const VenuesLoading(),
        isA<VenuesLoaded>().having((s) => s.userLat, 'userLat null', null),
      ],
    );

    // =========================================================================
    // 2.2.1 RED — Search filter (client-side)
    // =========================================================================

    blocTest<VenuesCubit, VenuesState>(
      'setSearch: filters allVenues by name case-insensitively',
      build: () {
        when(() => locationService.getCurrentLocation()).thenThrow(
          const LocationFailure(code: 'LOCATION_DENIED', message: 'x'),
        );
        when(() => repository.listVenues()).thenAnswer(
          (_) async => [
            _venue(id: 'padel'),
            VenueDto(id: 'tennis', name: 'Club Tennis', address: null, latitude: null, longitude: null),
          ],
        );
        return VenuesCubit(
          repository: repository,
          locationService: locationService,
        );
      },
      act: (cubit) async {
        await cubit.loadWithGps();
        cubit.setSearch('padel');
      },
      expect: () => [
        const VenuesLoading(),
        isA<VenuesLoaded>().having((s) => s.venues.length, 'all 2 visible initially', 2),
        isA<VenuesLoaded>()
            .having((s) => s.venues.length, 'only 1 matches padel', 1)
            .having((s) => s.searchQuery, 'searchQuery updated', 'padel'),
      ],
    );

    blocTest<VenuesCubit, VenuesState>(
      'setSearch: empty string shows all venues',
      build: () {
        when(() => locationService.getCurrentLocation()).thenThrow(
          const LocationFailure(code: 'LOCATION_DENIED', message: 'x'),
        );
        when(() => repository.listVenues()).thenAnswer(
          (_) async => [
            VenueDto(id: 'padel', name: 'Club Padel', address: null, latitude: null, longitude: null),
            VenueDto(id: 'tennis', name: 'Club Tennis', address: null, latitude: null, longitude: null),
          ],
        );
        return VenuesCubit(
          repository: repository,
          locationService: locationService,
        );
      },
      act: (cubit) async {
        await cubit.loadWithGps();
        cubit.setSearch('padel');
        cubit.setSearch('');
      },
      expect: () => [
        const VenuesLoading(),
        isA<VenuesLoaded>().having((s) => s.venues.length, 'all 2', 2),
        isA<VenuesLoaded>().having((s) => s.venues.length, 'filtered to 1', 1),
        isA<VenuesLoaded>().having((s) => s.venues.length, 'back to 2', 2),
      ],
    );

    // =========================================================================
    // 2.2.1 RED — Sport filter
    // =========================================================================

    blocTest<VenuesCubit, VenuesState>(
      'setSport: filters venues whose sports array contains the selected sport',
      build: () {
        when(() => locationService.getCurrentLocation()).thenThrow(
          const LocationFailure(code: 'LOCATION_DENIED', message: 'x'),
        );
        when(() => repository.listVenues()).thenAnswer(
          (_) async => [
            VenueDto(
              id: 'padel-club',
              name: 'Club Padel',
              address: null,
              latitude: null,
              longitude: null,
              sports: const ['PADEL'],
            ),
            VenueDto(
              id: 'tennis-club',
              name: 'Club Tennis',
              address: null,
              latitude: null,
              longitude: null,
              sports: const ['TENNIS'],
            ),
          ],
        );
        return VenuesCubit(
          repository: repository,
          locationService: locationService,
        );
      },
      act: (cubit) async {
        await cubit.loadWithGps();
        cubit.setSport('TENNIS');
      },
      expect: () => [
        const VenuesLoading(),
        isA<VenuesLoaded>().having((s) => s.venues.length, 'both visible', 2),
        isA<VenuesLoaded>()
            .having((s) => s.venues.length, 'only tennis', 1)
            .having((s) => s.selectedSport, 'selectedSport set', 'TENNIS'),
      ],
    );

    blocTest<VenuesCubit, VenuesState>(
      'setSport(null): clears sport filter',
      build: () {
        when(() => locationService.getCurrentLocation()).thenThrow(
          const LocationFailure(code: 'LOCATION_DENIED', message: 'x'),
        );
        when(() => repository.listVenues()).thenAnswer(
          (_) async => [
            VenueDto(id: 'a', name: 'A', address: null, latitude: null, longitude: null, sports: const ['PADEL']),
            VenueDto(id: 'b', name: 'B', address: null, latitude: null, longitude: null, sports: const ['TENNIS']),
          ],
        );
        return VenuesCubit(
          repository: repository,
          locationService: locationService,
        );
      },
      act: (cubit) async {
        await cubit.loadWithGps();
        cubit.setSport('PADEL');
        cubit.setSport(null);
      },
      expect: () => [
        const VenuesLoading(),
        isA<VenuesLoaded>().having((s) => s.venues.length, 'both', 2),
        isA<VenuesLoaded>().having((s) => s.venues.length, 'only padel', 1),
        isA<VenuesLoaded>()
            .having((s) => s.venues.length, 'back to all', 2)
            .having((s) => s.selectedSport, 'selectedSport cleared', null),
      ],
    );

    // =========================================================================
    // 2.2.1 RED — Indoor filter
    // =========================================================================

    blocTest<VenuesCubit, VenuesState>(
      'setIndoor(true): filters only venues with at least one indoor court — not yet implemented; sports field used as proxy',
      build: () {
        when(() => locationService.getCurrentLocation()).thenThrow(
          const LocationFailure(code: 'LOCATION_DENIED', message: 'x'),
        );
        when(() => repository.listVenues()).thenAnswer(
          (_) async => [_venue(id: 'a'), _venue(id: 'b')],
        );
        return VenuesCubit(
          repository: repository,
          locationService: locationService,
        );
      },
      act: (cubit) async {
        await cubit.loadWithGps();
        cubit.setIndoor(true);
        cubit.setIndoor(false);
      },
      expect: () => [
        const VenuesLoading(),
        isA<VenuesLoaded>().having((s) => s.indoorOnly, 'indoorOnly false initially', false),
        isA<VenuesLoaded>().having((s) => s.indoorOnly, 'indoorOnly true', true),
        isA<VenuesLoaded>().having((s) => s.indoorOnly, 'indoorOnly false again', false),
      ],
    );

    // =========================================================================
    // 2.2.1 RED — Repository error emits VenuesFailure
    // =========================================================================

    blocTest<VenuesCubit, VenuesState>(
      'loadWithGps: repository error emits VenuesFailure',
      build: () {
        when(() => locationService.getCurrentLocation()).thenThrow(
          const LocationFailure(code: 'LOCATION_DENIED', message: 'x'),
        );
        when(() => repository.listVenues()).thenThrow(
          const AppFailure(code: 'NETWORK_ERROR', message: 'Sin conexión.'),
        );
        return VenuesCubit(
          repository: repository,
          locationService: locationService,
        );
      },
      act: (cubit) => cubit.loadWithGps(),
      expect: () => [
        const VenuesLoading(),
        isA<VenuesFailure>().having((s) => s.message, 'message', 'Sin conexión.'),
      ],
    );
  });
}
