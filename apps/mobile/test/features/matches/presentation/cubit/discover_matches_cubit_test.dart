import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/open_match_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/discover_matches_cubit.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/discover_matches_state.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

OpenMatchDto _openMatch({DateTime? scheduledAt}) {
  final when = scheduledAt ??
      DateTime(
        DateTime.now().year,
        DateTime.now().month,
        DateTime.now().day,
        18,
        0,
      );
  return OpenMatchDto(
    id: 'match-1',
    sportId: 'sport',
    categoryId: 'cat',
    status: 'SCHEDULED',
    scheduledAt: when,
    pricePerPlayerCents: 1500,
    maxParticipants: 4,
    participantCount: 2,
    openSpots: 2,
    clubName: 'Club Test',
    courtName: 'Cancha 1',
    locationLabel: null,
  );
}

void main() {
  group('DiscoverMatchesCubit', () {
    late _MockMatchesRepository matchesRepository;

    setUp(() {
      matchesRepository = _MockMatchesRepository();
    });

    blocTest<DiscoverMatchesCubit, DiscoverMatchesState>(
      'should emit loaded with visible items when load succeeds',
      build: () {
        when(() => matchesRepository.resolveDefaultSportId())
            .thenAnswer((_) async => 'sport');
        when(
          () => matchesRepository.listOpenMatches(
            sportId: any(named: 'sportId'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
            gender: any(named: 'gender'),
            venueId: any(named: 'venueId'),
            categoryId: any(named: 'categoryId'),
          ),
        ).thenAnswer(
          (_) async => OpenMatchesPage(
            items: [_openMatch()],
            page: 1,
            limit: 20,
            total: 1,
          ),
        );
        return DiscoverMatchesCubit(matchesRepository: matchesRepository);
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        isA<DiscoverMatchesLoading>(),
        isA<DiscoverMatchesLoaded>()
            .having((s) => s.visibleItems.length, 'visibleItems', 1),
      ],
    );

    blocTest<DiscoverMatchesCubit, DiscoverMatchesState>(
      'should filter by query when setQuery is called',
      build: () {
        when(() => matchesRepository.resolveDefaultSportId())
            .thenAnswer((_) async => 'sport');
        when(
          () => matchesRepository.listOpenMatches(
            sportId: any(named: 'sportId'),
            page: any(named: 'page'),
            limit: any(named: 'limit'),
            gender: any(named: 'gender'),
            venueId: any(named: 'venueId'),
            categoryId: any(named: 'categoryId'),
          ),
        ).thenAnswer(
          (_) async => OpenMatchesPage(
            items: [
              _openMatch(),
              OpenMatchDto(
                id: 'match-2',
                sportId: 'sport',
                categoryId: 'cat',
                status: 'SCHEDULED',
                scheduledAt: DateTime(
                  DateTime.now().year,
                  DateTime.now().month,
                  DateTime.now().day,
                  19,
                  0,
                ),
                pricePerPlayerCents: 1500,
                maxParticipants: 4,
                participantCount: 2,
                openSpots: 2,
                clubName: 'Otro Club',
                courtName: 'Cancha 2',
                locationLabel: null,
              ),
            ],
            page: 1,
            limit: 20,
            total: 2,
          ),
        );
        return DiscoverMatchesCubit(matchesRepository: matchesRepository);
      },
      act: (cubit) async {
        await cubit.load();
        cubit.setQuery('Otro');
      },
      skip: 1,
      verify: (cubit) {
        final state = cubit.state as DiscoverMatchesLoaded;
        expect(state.visibleItems.length, 1);
        expect(state.visibleItems.first.clubName, 'Otro Club');
      },
    );
  });
}
