import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/core/location/location_service.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/user_location_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_page.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_api.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournaments_list_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournaments_list_state.dart';
import 'package:cuadrala_mobile/src/features/venues/data/venues_repository.dart';

class _MockTournamentsRepository extends Mock implements TournamentsRepository {}
class _MockCatalogRepository extends Mock implements CatalogRepository {}
class _MockVenuesRepository extends Mock implements VenuesRepository {}
class _MockProfileRepository extends Mock implements ProfileRepository {}
class _MockOnboardingRepository extends Mock implements OnboardingRepository {}
class _MockLocationService extends Mock implements LocationService {}

const _meNoCategory = UserMeDto(
  id: 'user-1',
  email: 'user@test.local',
  name: 'Jugador',
  subscriptionType: 'FREE',
);

const _meWithCategory = UserMeDto(
  id: 'user-2',
  email: 'user2@test.local',
  name: 'Jugadora',
  subscriptionType: 'FREE',
  primaryRating: UserPrimaryRatingDto(
    categoryId: 'cat-own',
    categoryName: 'Cuarta',
    sportId: 'sport-1',
    rating: 3.5,
  ),
);

void main() {
  group('TournamentsListCubit', () {
    late _MockTournamentsRepository tournamentsRepository;
    late _MockCatalogRepository catalogRepository;
    late _MockVenuesRepository venuesRepository;
    late _MockProfileRepository profileRepository;

    setUp(() {
      tournamentsRepository = _MockTournamentsRepository();
      catalogRepository = _MockCatalogRepository();
      venuesRepository = _MockVenuesRepository();
      profileRepository = _MockProfileRepository();
      // Default: loading sports/categories/venues returns empty (silent fail for tests)
      when(() => catalogRepository.listSports())
          .thenAnswer((_) async => []);
      when(() => catalogRepository.listCategories(sportId: any(named: 'sportId')))
          .thenAnswer((_) async => []);
      when(() => venuesRepository.listVenues(
            page: any(named: 'page'),
            limit: any(named: 'limit'),
            near: any(named: 'near'),
            radiusKm: any(named: 'radiusKm'),
            sportType: any(named: 'sportType'),
          )).thenAnswer((_) async => []);
      // Default: sin rating primario. Los tests de M3c-1 pisan esto puntualmente.
      when(() => profileRepository.getMe()).thenAnswer((_) async => _meNoCategory);
    });

    final testPage = TournamentListPage(
      items: const [
        TournamentListItemDto(
          id: 't-1',
          name: 'Torneo 1',
          status: 'REGISTRATION_OPEN',
          sportName: 'Padel',
          categoryName: 'Masculino',
          categoryId: 'cat-1',
          startsAt: null,
          registrationCount: 8,
        ),
      ],
      page: 1,
      limit: 20,
      total: 2, // 2 items total, only 1 on this page → hasReachedEnd=false
    );

    blocTest<TournamentsListCubit, TournamentsListState>(
      'load (ok) emite loading→loaded',
      build: () {
        when(() => tournamentsRepository.listTournaments(
              page: any(named: 'page'),
              limit: any(named: 'limit'),
              filters: any(named: 'filters'),
            )).thenAnswer((_) async => testPage);
        return TournamentsListCubit(
          tournamentsRepository: tournamentsRepository,
          catalogRepository: catalogRepository,
          venuesRepository: venuesRepository,
          profileRepository: profileRepository,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const TournamentsListLoading(),
        isA<TournamentsListLoaded>()
            .having((s) => s.items.length, 'items.length', 1)
            .having((s) => s.hasReachedEnd, 'hasReachedEnd', false),
      ],
    );

    blocTest<TournamentsListCubit, TournamentsListState>(
      'load (error) emite loading→failure',
      build: () {
        when(() => tournamentsRepository.listTournaments(
              page: any(named: 'page'),
              limit: any(named: 'limit'),
              filters: any(named: 'filters'),
            )).thenThrow(
          const AppFailure(code: 'HTTP_500', message: 'Error del servidor.'),
        );
        return TournamentsListCubit(
          tournamentsRepository: tournamentsRepository,
          catalogRepository: catalogRepository,
          venuesRepository: venuesRepository,
          profileRepository: profileRepository,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const TournamentsListLoading(),
        const TournamentsListFailure(message: 'Error del servidor.'),
      ],
    );

    blocTest<TournamentsListCubit, TournamentsListState>(
      'loadMore appends items',
      build: () {
        when(() => tournamentsRepository.listTournaments(
              page: any(named: 'page'),
              limit: any(named: 'limit'),
              filters: any(named: 'filters'),
            )).thenAnswer((inv) async {
          final page = inv.namedArguments[#page] as int;
          if (page == 1) return testPage;
          return TournamentListPage(
            items: const [
              TournamentListItemDto(
                id: 't-2',
                name: 'Torneo 2',
                status: 'IN_PROGRESS',
                sportName: 'Padel',
                categoryName: 'Femenino',
                categoryId: 'cat-2',
                startsAt: null,
                registrationCount: 4,
              ),
            ],
            page: 2,
            limit: 20,
            total: 1,
          );
        });
        return TournamentsListCubit(
          tournamentsRepository: tournamentsRepository,
          catalogRepository: catalogRepository,
          venuesRepository: venuesRepository,
          profileRepository: profileRepository,
        );
      },
      act: (cubit) async {
        await cubit.load();
        await Future.delayed(Duration.zero);
        await cubit.loadMore();
      },
      expect: () => [
        const TournamentsListLoading(),
        isA<TournamentsListLoaded>().having((s) => s.items.length, 'page1 items', 1),
        isA<TournamentsListLoaded>()
            .having((s) => s.isLoadingMore, 'isLoadingMore', true),
        isA<TournamentsListLoaded>()
            .having((s) => s.items.length, 'after loadMore items', 2)
            .having((s) => s.isLoadingMore, 'isLoadingMore', false),
      ],
    );

    blocTest<TournamentsListCubit, TournamentsListState>(
      'applyFilters cambia filtros y recarga',
      build: () {
        when(() => tournamentsRepository.listTournaments(
              page: any(named: 'page'),
              limit: any(named: 'limit'),
              filters: any(named: 'filters'),
            )).thenAnswer((inv) async {
          final filters = inv.namedArguments[#filters] as TournamentListFilters?;
          if (filters?.status == 'FINISHED') {
            return TournamentListPage(items: const [], page: 1, limit: 20, total: 0);
          }
          return testPage;
        });
        return TournamentsListCubit(
          tournamentsRepository: tournamentsRepository,
          catalogRepository: catalogRepository,
          venuesRepository: venuesRepository,
          profileRepository: profileRepository,
        );
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.applyFilters(
          const TournamentListFilters(status: 'FINISHED'),
        );
      },
      expect: () => [
        const TournamentsListLoading(),
        isA<TournamentsListLoaded>()
            .having((s) => s.items.length, 'page1 items', 1)
            .having((s) => s.filters.status, 'filters.status', null),
        const TournamentsListLoading(),
        isA<TournamentsListLoaded>()
            .having((s) => s.items.length, 'filtered items', 0)
            .having((s) => s.filters.status, 'filters.status', 'FINISHED'),
      ],
    );

    blocTest<TournamentsListCubit, TournamentsListState>(
      'clearFilters resetea a lista completa',
      build: () {
        when(() => tournamentsRepository.listTournaments(
              page: any(named: 'page'),
              limit: any(named: 'limit'),
              filters: any(named: 'filters'),
            )).thenAnswer((inv) async {
          final filters = inv.namedArguments[#filters] as TournamentListFilters?;
          if (filters?.status != null) {
            return TournamentListPage(items: const [], page: 1, limit: 20, total: 0);
          }
          return testPage;
        });
        return TournamentsListCubit(
          tournamentsRepository: tournamentsRepository,
          catalogRepository: catalogRepository,
          venuesRepository: venuesRepository,
          profileRepository: profileRepository,
        );
      },
      act: (cubit) async {
        await cubit.applyFilters(const TournamentListFilters(status: 'FINISHED'));
        cubit.clearFilters();
      },
      expect: () => [
        const TournamentsListLoading(),
        isA<TournamentsListLoaded>().having((s) => s.items.length, 'filtered', 0),
        const TournamentsListLoading(),
        isA<TournamentsListLoaded>()
            .having((s) => s.items.length, 'cleared', 1)
            .having((s) => s.filters.status, 'filters.status', null),
      ],
    );

    blocTest<TournamentsListCubit, TournamentsListState>(
      'pull-to-refresh respeta filtros activos',
      build: () {
        when(() => tournamentsRepository.listTournaments(
              page: any(named: 'page'),
              limit: any(named: 'limit'),
              filters: any(named: 'filters'),
            )).thenAnswer((inv) async {
          final filters = inv.namedArguments[#filters] as TournamentListFilters?;
          if (filters?.status == 'FINISHED') {
            return TournamentListPage(items: const [], page: 1, limit: 20, total: 0);
          }
          return testPage;
        });
        return TournamentsListCubit(
          tournamentsRepository: tournamentsRepository,
          catalogRepository: catalogRepository,
          venuesRepository: venuesRepository,
          profileRepository: profileRepository,
        );
      },
      act: (cubit) async {
        await cubit.applyFilters(const TournamentListFilters(status: 'FINISHED'));
        await cubit.load(); // refresh
      },
      expect: () => [
        const TournamentsListLoading(),
        isA<TournamentsListLoaded>().having((s) => s.filters.status, 'filtered', 'FINISHED'),
        const TournamentsListLoading(),
        // refresh should respect the FINISHED filter
        isA<TournamentsListLoaded>()
            .having((s) => s.filters.status, 'after refresh still FINISHED', 'FINISHED'),
      ],
    );

    group('Mi categoría default-on (M3c-1)', () {
      blocTest<TournamentsListCubit, TournamentsListState>(
        "defaults categoryId to the viewer's primary category on first load",
        setUp: () {
          when(() => profileRepository.getMe()).thenAnswer((_) async => _meWithCategory);
          when(() => tournamentsRepository.listTournaments(
                page: any(named: 'page'),
                limit: any(named: 'limit'),
                filters: any(named: 'filters'),
              )).thenAnswer((_) async => testPage);
        },
        build: () => TournamentsListCubit(
          tournamentsRepository: tournamentsRepository,
          catalogRepository: catalogRepository,
          venuesRepository: venuesRepository,
          profileRepository: profileRepository,
        ),
        act: (cubit) => cubit.load(),
        expect: () => [
          const TournamentsListLoading(),
          isA<TournamentsListLoaded>()
              .having((s) => s.filters.categoryId, 'filters.categoryId', 'cat-own')
              .having((s) => s.hasOwnCategory, 'hasOwnCategory', true)
              .having((s) => s.ownCategoryId, 'ownCategoryId', 'cat-own')
              .having((s) => s.ownCategoryLabel, 'ownCategoryLabel', 'Cuarta'),
        ],
      );

      blocTest<TournamentsListCubit, TournamentsListState>(
        'never surfaces a category default when the viewer has none',
        setUp: () {
          when(() => profileRepository.getMe()).thenAnswer((_) async => _meNoCategory);
          when(() => tournamentsRepository.listTournaments(
                page: any(named: 'page'),
                limit: any(named: 'limit'),
                filters: any(named: 'filters'),
              )).thenAnswer((_) async => testPage);
        },
        build: () => TournamentsListCubit(
          tournamentsRepository: tournamentsRepository,
          catalogRepository: catalogRepository,
          venuesRepository: venuesRepository,
          profileRepository: profileRepository,
        ),
        act: (cubit) => cubit.load(),
        expect: () => [
          const TournamentsListLoading(),
          isA<TournamentsListLoaded>()
              .having((s) => s.filters.categoryId, 'filters.categoryId', null)
              .having((s) => s.hasOwnCategory, 'hasOwnCategory', false)
              .having((s) => s.ownCategoryId, 'ownCategoryId', null)
              .having((s) => s.ownCategoryLabel, 'ownCategoryLabel', null),
        ],
      );

      blocTest<TournamentsListCubit, TournamentsListState>(
        'does not re-derive or clobber a category the caller already cleared, on a later refresh',
        setUp: () {
          when(() => profileRepository.getMe()).thenAnswer((_) async => _meWithCategory);
          when(() => tournamentsRepository.listTournaments(
                page: any(named: 'page'),
                limit: any(named: 'limit'),
                filters: any(named: 'filters'),
              )).thenAnswer((_) async => testPage);
        },
        build: () => TournamentsListCubit(
          tournamentsRepository: tournamentsRepository,
          catalogRepository: catalogRepository,
          venuesRepository: venuesRepository,
          profileRepository: profileRepository,
        ),
        act: (cubit) async {
          await cubit.load();
          cubit.clearFilters();
          await Future.delayed(Duration.zero);
          await cubit.load(); // refresh
        },
        expect: () => [
          const TournamentsListLoading(),
          isA<TournamentsListLoaded>()
              .having((s) => s.filters.categoryId, 'defaulted', 'cat-own'),
          const TournamentsListLoading(),
          isA<TournamentsListLoaded>()
              .having((s) => s.filters.categoryId, 'cleared by the user', null),
          const TournamentsListLoading(),
          isA<TournamentsListLoaded>()
              .having((s) => s.filters.categoryId, 'still cleared after refresh', null),
        ],
        verify: (_) {
          // getMe() sólo se llama una vez por cubit, nunca en cada load().
          verify(() => profileRepository.getMe()).called(1);
        },
      );
    });

    group('Cerca (M3d)', () {
      late _MockOnboardingRepository onboardingRepository;
      late _MockLocationService locationService;

      setUp(() {
        onboardingRepository = _MockOnboardingRepository();
        locationService = _MockLocationService();
        when(() => tournamentsRepository.listTournaments(
              page: any(named: 'page'),
              limit: any(named: 'limit'),
              filters: any(named: 'filters'),
            )).thenAnswer((_) async => testPage);
      });

      TournamentsListCubit buildCubit() => TournamentsListCubit(
            tournamentsRepository: tournamentsRepository,
            catalogRepository: catalogRepository,
            venuesRepository: venuesRepository,
            profileRepository: profileRepository,
            onboardingRepository: onboardingRepository,
            locationService: locationService,
          );

      blocTest<TournamentsListCubit, TournamentsListState>(
        'applies near from the saved location, without touching the GPS',
        setUp: () {
          when(() => onboardingRepository.getLocation()).thenAnswer(
            (_) async => const UserLocationDto(
              label: 'Casa',
              latitude: -10.5,
              longitude: -66.9,
              radiusKm: 20,
            ),
          );
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          await cubit.toggleNear();
        },
        expect: () => [
          const TournamentsListLoading(),
          isA<TournamentsListLoaded>()
              .having((s) => s.filters.near, 'near before toggle', null),
          const TournamentsListLoading(),
          isA<TournamentsListLoaded>()
              .having((s) => s.filters.near, 'near', '-10.5,-66.9')
              .having((s) => s.filters.radiusKm, 'radiusKm', 10),
        ],
        verify: (_) {
          verify(() => onboardingRepository.getLocation()).called(1);
          verifyNever(() => locationService.getCurrentLocation());
        },
      );

      blocTest<TournamentsListCubit, TournamentsListState>(
        'falls back to GPS when there is no saved location',
        setUp: () {
          when(() => onboardingRepository.getLocation())
              .thenAnswer((_) async => null);
          when(() => locationService.getCurrentLocation()).thenAnswer(
            (_) async =>
                const DeviceLocation(latitude: -10.4, longitude: -66.8),
          );
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          await cubit.toggleNear();
        },
        expect: () => [
          const TournamentsListLoading(),
          isA<TournamentsListLoaded>(),
          const TournamentsListLoading(),
          isA<TournamentsListLoaded>()
              .having((s) => s.filters.near, 'near', '-10.4,-66.8')
              .having((s) => s.filters.radiusKm, 'radiusKm', 10),
        ],
      );

      blocTest<TournamentsListCubit, TournamentsListState>(
        'stays inactive when neither the saved location nor GPS resolve',
        setUp: () {
          when(() => onboardingRepository.getLocation())
              .thenAnswer((_) async => null);
          when(() => locationService.getCurrentLocation()).thenThrow(
            const LocationFailure(
              code: 'LOCATION_DENIED',
              message: 'Necesitamos permiso de ubicación.',
            ),
          );
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          await cubit.toggleNear();
        },
        expect: () => [
          const TournamentsListLoading(),
          isA<TournamentsListLoaded>()
              .having((s) => s.filters.near, 'near stays null', null),
        ],
      );

      blocTest<TournamentsListCubit, TournamentsListState>(
        'toggling again clears the near filter',
        setUp: () {
          when(() => onboardingRepository.getLocation()).thenAnswer(
            (_) async => const UserLocationDto(
              label: null,
              latitude: -10.5,
              longitude: -66.9,
              radiusKm: 20,
            ),
          );
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          await cubit.toggleNear();
          await cubit.toggleNear();
        },
        expect: () => [
          const TournamentsListLoading(),
          isA<TournamentsListLoaded>(),
          const TournamentsListLoading(),
          isA<TournamentsListLoaded>()
              .having((s) => s.filters.near, 'near after first toggle', '-10.5,-66.9'),
          const TournamentsListLoading(),
          isA<TournamentsListLoaded>()
              .having((s) => s.filters.near, 'near after second toggle', null)
              .having((s) => s.filters.radiusKm, 'radiusKm after clear', null),
        ],
      );
    });
  });
}
