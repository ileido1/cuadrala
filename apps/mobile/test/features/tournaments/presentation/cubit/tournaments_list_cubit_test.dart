import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_page.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_api.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournaments_list_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournaments_list_state.dart';

class _MockTournamentsRepository extends Mock implements TournamentsRepository {}

void main() {
  group('TournamentsListCubit', () {
    late _MockTournamentsRepository tournamentsRepository;

    setUp(() {
      tournamentsRepository = _MockTournamentsRepository();
    });

    final testPage = TournamentListPage(
      items: const [
        TournamentListItemDto(
          id: 't-1',
          name: 'Torneo 1',
          status: 'REGISTRATION_OPEN',
          sportName: 'Padel',
          categoryName: 'Masculino',
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
        return TournamentsListCubit(tournamentsRepository: tournamentsRepository);
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
        return TournamentsListCubit(tournamentsRepository: tournamentsRepository);
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
                startsAt: null,
                registrationCount: 4,
              ),
            ],
            page: 2,
            limit: 20,
            total: 1,
          );
        });
        return TournamentsListCubit(tournamentsRepository: tournamentsRepository);
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
        return TournamentsListCubit(tournamentsRepository: tournamentsRepository);
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
        return TournamentsListCubit(tournamentsRepository: tournamentsRepository);
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
        return TournamentsListCubit(tournamentsRepository: tournamentsRepository);
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
  });
}
