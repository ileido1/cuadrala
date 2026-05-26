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
      int openSpots = 4,
    }) {
      return OpenMatchDto(
        id: id,
        sportId: 'sport',
        categoryId: 'cat',
        status: 'SCHEDULED',
        scheduledAt: scheduledAt,
        pricePerPlayerCents: 1000,
        maxParticipants: 4,
        participantCount: 4 - openSpots,
        openSpots: openSpots,
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

    // =========================================================================
    // Phase 1 RED — New state fields
    // =========================================================================

    test('TimeBucket enum has 3 values', () {
      expect(TimeBucket.values.length, 3);
      expect(TimeBucket.values, containsAll([TimeBucket.morning, TimeBucket.afternoon, TimeBucket.evening]));
    });

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'initial loaded state: selectedDate is today, activeTimeBuckets empty, onlyAvailable false',
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
        isA<OpenMatchesLoaded>()
            .having((s) => s.activeTimeBuckets, 'activeTimeBuckets', isEmpty)
            .having((s) => s.onlyAvailable, 'onlyAvailable', false)
            .having(
              (s) => s.selectedDate != null &&
                  s.selectedDate!.year == DateTime.now().year &&
                  s.selectedDate!.month == DateTime.now().month &&
                  s.selectedDate!.day == DateTime.now().day,
              'selectedDate is today',
              true,
            ),
      ],
    );

    // =========================================================================
    // Phase 2 RED — Cubit methods
    // =========================================================================

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'selectDate changes selectedDate and filters by day',
      build: () {
        when(() => matchesRepository.resolveDefaultSportId())
            .thenAnswer((_) async => 'sport');
        final today = DateTime.now();
        final tomorrow = today.add(const Duration(days: 1));
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
              match(id: 'today', scheduledAt: today),
              match(id: 'tomorrow', scheduledAt: tomorrow),
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
        cubit.selectDate(DateTime.now().add(const Duration(days: 1)));
      },
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>().having((s) => s.visibleItems.length, 'after load: today only', 1),
        isA<OpenMatchesLoaded>()
            .having((s) => s.visibleItems.length, 'after selectDate tomorrow: 1', 1)
            .having((s) => s.visibleItems.first.id, 'item is tomorrow', 'tomorrow'),
      ],
    );

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'toggleTimeBucket adds and removes bucket',
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
      act: (cubit) async {
        await cubit.load();
        cubit.toggleTimeBucket(TimeBucket.morning);
        cubit.toggleTimeBucket(TimeBucket.morning); // toggle off
      },
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>().having(
          (s) => s.activeTimeBuckets,
          'morning added',
          {TimeBucket.morning},
        ),
        isA<OpenMatchesLoaded>().having(
          (s) => s.activeTimeBuckets,
          'morning removed',
          isEmpty,
        ),
      ],
    );

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'setOnlyAvailable changes onlyAvailable',
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
      act: (cubit) async {
        await cubit.load();
        cubit.setOnlyAvailable(true);
        cubit.setOnlyAvailable(false);
      },
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>().having((s) => s.onlyAvailable, 'onlyAvailable true', true),
        isA<OpenMatchesLoaded>().having((s) => s.onlyAvailable, 'onlyAvailable false', false),
      ],
    );

    // =========================================================================
    // Phase 2 — Filter predicate tests
    // =========================================================================

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'null scheduledAt always passes date filter',
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
            items: [match(id: 'unscheduled')], // scheduledAt is null
            page: 1,
            limit: 20,
            total: 1,
          ),
        );
        return OpenMatchesCubit(matchesRepository: matchesRepository);
      },
      act: (cubit) async {
        await cubit.load();
        cubit.selectDate(DateTime(2099, 12, 31)); // far future — won't match any real date
      },
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>(),
        // null scheduledAt must still show even with an obscure date selected
        isA<OpenMatchesLoaded>().having((s) => s.visibleItems.length, 'unscheduled still visible', 1),
      ],
    );

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'null scheduledAt always passes time bucket filter',
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
            items: [match(id: 'unscheduled')],
            page: 1,
            limit: 20,
            total: 1,
          ),
        );
        return OpenMatchesCubit(matchesRepository: matchesRepository);
      },
      act: (cubit) async {
        await cubit.load();
        cubit.selectDate(null); // show all days
        cubit.toggleTimeBucket(TimeBucket.morning);
      },
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>().having((s) => s.visibleItems.length, 'unscheduled visible with morning filter', 1),
      ],
    );

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'empty activeTimeBuckets shows all',
      build: () {
        when(() => matchesRepository.resolveDefaultSportId())
            .thenAnswer((_) async => 'sport');
        final today = DateTime.now();
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
              match(id: 'm', scheduledAt: DateTime(today.year, today.month, today.day, 8)), // morning
              match(id: 'a', scheduledAt: DateTime(today.year, today.month, today.day, 14)), // afternoon
              match(id: 'e', scheduledAt: DateTime(today.year, today.month, today.day, 20)), // evening
            ],
            page: 1,
            limit: 20,
            total: 3,
          ),
        );
        return OpenMatchesCubit(matchesRepository: matchesRepository);
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>().having((s) => s.visibleItems.length, 'all 3 visible with empty buckets', 3),
      ],
    );

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'time bucket morning filters hour < 12',
      build: () {
        when(() => matchesRepository.resolveDefaultSportId())
            .thenAnswer((_) async => 'sport');
        final today = DateTime.now();
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
              match(id: 'm', scheduledAt: DateTime(today.year, today.month, today.day, 11)),
              match(id: 'a', scheduledAt: DateTime(today.year, today.month, today.day, 12)),
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
        cubit.selectDate(null);
        cubit.toggleTimeBucket(TimeBucket.morning);
      },
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>()
            .having((s) => s.visibleItems.length, 'only morning (hour<12)', 1)
            .having((s) => s.visibleItems.first.id, 'is morning match', 'm'),
      ],
    );

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'time bucket afternoon filters 12<=hour<19',
      build: () {
        when(() => matchesRepository.resolveDefaultSportId())
            .thenAnswer((_) async => 'sport');
        final today = DateTime.now();
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
              match(id: 'a1', scheduledAt: DateTime(today.year, today.month, today.day, 12)),
              match(id: 'a2', scheduledAt: DateTime(today.year, today.month, today.day, 18)),
              match(id: 'e', scheduledAt: DateTime(today.year, today.month, today.day, 19)),
            ],
            page: 1,
            limit: 20,
            total: 3,
          ),
        );
        return OpenMatchesCubit(matchesRepository: matchesRepository);
      },
      act: (cubit) async {
        await cubit.load();
        cubit.selectDate(null);
        cubit.toggleTimeBucket(TimeBucket.afternoon);
      },
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>().having((s) => s.visibleItems.length, '2 afternoon matches (12 and 18)', 2),
      ],
    );

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'time bucket evening filters hour >= 19',
      build: () {
        when(() => matchesRepository.resolveDefaultSportId())
            .thenAnswer((_) async => 'sport');
        final today = DateTime.now();
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
              match(id: 'e1', scheduledAt: DateTime(today.year, today.month, today.day, 19)),
              match(id: 'e2', scheduledAt: DateTime(today.year, today.month, today.day, 23)),
              match(id: 'a', scheduledAt: DateTime(today.year, today.month, today.day, 18)),
            ],
            page: 1,
            limit: 20,
            total: 3,
          ),
        );
        return OpenMatchesCubit(matchesRepository: matchesRepository);
      },
      act: (cubit) async {
        await cubit.load();
        cubit.selectDate(null);
        cubit.toggleTimeBucket(TimeBucket.evening);
      },
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>().having((s) => s.visibleItems.length, '2 evening matches (19 and 23)', 2),
      ],
    );

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'onlyAvailable hides matches with openSpots==0',
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
              match(id: 'available', openSpots: 2),
              match(id: 'full', openSpots: 0),
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
        cubit.selectDate(null);
        cubit.setOnlyAvailable(true);
      },
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>().having((s) => s.visibleItems.length, 'both visible before filter', 2),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>()
            .having((s) => s.visibleItems.length, 'only 1 available', 1)
            .having((s) => s.visibleItems.first.id, 'is available match', 'available'),
      ],
    );

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'all three filters compose with AND logic',
      build: () {
        when(() => matchesRepository.resolveDefaultSportId())
            .thenAnswer((_) async => 'sport');
        final today = DateTime.now();
        final tomorrow = today.add(const Duration(days: 1));
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
              // today morning available -> passes all
              match(
                id: 'ok',
                scheduledAt: DateTime(today.year, today.month, today.day, 9),
                openSpots: 2,
              ),
              // today morning full -> fails availability
              match(
                id: 'full',
                scheduledAt: DateTime(today.year, today.month, today.day, 10),
                openSpots: 0,
              ),
              // tomorrow morning available -> fails date
              match(
                id: 'tomorrow',
                scheduledAt: DateTime(tomorrow.year, tomorrow.month, tomorrow.day, 9),
                openSpots: 2,
              ),
              // today evening available -> fails time bucket
              match(
                id: 'evening',
                scheduledAt: DateTime(today.year, today.month, today.day, 20),
                openSpots: 2,
              ),
            ],
            page: 1,
            limit: 20,
            total: 4,
          ),
        );
        return OpenMatchesCubit(matchesRepository: matchesRepository);
      },
      act: (cubit) async {
        await cubit.load();
        cubit.toggleTimeBucket(TimeBucket.morning);
        cubit.setOnlyAvailable(true);
      },
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>(),
        isA<OpenMatchesLoaded>()
            .having((s) => s.visibleItems.length, 'only 1 passes all filters', 1)
            .having((s) => s.visibleItems.first.id, 'is the ok match', 'ok'),
      ],
    );
  });
}
