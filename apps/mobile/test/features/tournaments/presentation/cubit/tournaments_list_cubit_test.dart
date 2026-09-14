import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
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
              .having((s) => s.hasOwnCategory, 'hasOwnCategory', true),
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
              .having((s) => s.hasOwnCategory, 'hasOwnCategory', false),
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
  });
}
