import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/open_match_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/open_matches_cubit.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/open_matches_state.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

void main() {
  group('OpenMatchesCubit', () {
    late _MockMatchesRepository matchesRepository;

    setUp(() {
      matchesRepository = _MockMatchesRepository();
    });

    OpenMatchDto match({
      required String id,
      DateTime? scheduledAt,
      String? clubName,
    }) {
      return OpenMatchDto(
        id: id,
        sportId: 'sport',
        categoryId: 'cat',
        status: 'SCHEDULED',
        scheduledAt: scheduledAt,
        pricePerPlayerCents: 1000,
        maxParticipants: 4,
        participantCount: 0,
        openSpots: 4,
        clubName: clubName,
        courtName: null,
        locationLabel: null,
      );
    }

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'load emite loading→loaded y prepara visibleItems',
      build: () {
        when(() => matchesRepository.resolveDefaultSportId())
            .thenAnswer((_) async => 'sport');
        when(
          () => matchesRepository.listOpenMatches(
            sportId: 'sport',
            page: 1,
            limit: any(named: 'limit'),
            categoryId: any(named: 'categoryId'),
          ),
        ).thenAnswer(
          (_) async => OpenMatchesPage(items: [match(id: '1')], page: 1, limit: 20, total: 1),
        );
        return OpenMatchesCubit(matchesRepository: matchesRepository);
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>().having((s) => s.visibleItems.length, 'visibleItems.length', 1),
      ],
    );

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'setQuery filtra visibleItems por clubName',
      build: () {
        when(() => matchesRepository.resolveDefaultSportId())
            .thenAnswer((_) async => 'sport');
        when(
          () => matchesRepository.listOpenMatches(
            sportId: 'sport',
            page: 1,
            limit: any(named: 'limit'),
            categoryId: any(named: 'categoryId'),
          ),
        ).thenAnswer(
          (_) async => OpenMatchesPage(
            items: [
              match(id: '1', clubName: 'Club Palermo'),
              match(id: '2', clubName: 'Otro club'),
            ],
            page: 1,
            limit: 20,
            total: 2,
          ),
        );
        return OpenMatchesCubit(matchesRepository: matchesRepository);
      },
      act: (cubit) async {
        await cubit.load();
        cubit.setQuery('palermo');
      },
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>().having((s) => s.visibleItems.length, 'visibleItems.length', 1),
      ],
    );

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'toggleOnlyToday filtra por scheduledAt en el día',
      build: () {
        when(() => matchesRepository.resolveDefaultSportId())
            .thenAnswer((_) async => 'sport');
        final now = DateTime.now();
        when(
          () => matchesRepository.listOpenMatches(
            sportId: 'sport',
            page: 1,
            limit: any(named: 'limit'),
            categoryId: any(named: 'categoryId'),
          ),
        ).thenAnswer(
          (_) async => OpenMatchesPage(
            items: [
              match(id: '1', scheduledAt: now),
              match(id: '2', scheduledAt: now.add(const Duration(days: 1))),
            ],
            page: 1,
            limit: 20,
            total: 2,
          ),
        );
        return OpenMatchesCubit(matchesRepository: matchesRepository);
      },
      act: (cubit) async {
        await cubit.load();
        cubit.toggleOnlyToday();
      },
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>().having((s) => s.visibleItems.length, 'visibleItems.length', 1),
      ],
    );

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'loadMore agrega items y actualiza page',
      build: () {
        when(() => matchesRepository.resolveDefaultSportId())
            .thenAnswer((_) async => 'sport');
        when(
          () => matchesRepository.listOpenMatches(
            sportId: 'sport',
            page: 1,
            limit: any(named: 'limit'),
            categoryId: any(named: 'categoryId'),
          ),
        ).thenAnswer(
          (_) async => OpenMatchesPage(
            items: [match(id: '1')],
            page: 1,
            limit: 20,
            total: 2,
          ),
        );
        when(
          () => matchesRepository.listOpenMatches(
            sportId: 'sport',
            page: 2,
            limit: any(named: 'limit'),
            categoryId: any(named: 'categoryId'),
          ),
        ).thenAnswer(
          (_) async => OpenMatchesPage(
            items: [match(id: '2')],
            page: 2,
            limit: 20,
            total: 2,
          ),
        );
        return OpenMatchesCubit(matchesRepository: matchesRepository);
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.loadMore();
      },
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>().having((s) => s.isLoadingMore, 'isLoadingMore', true),
        isA<OpenMatchesLoaded>().having((s) => s.items.length, 'items.length', 2),
      ],
    );
  });
}

