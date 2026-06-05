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
      String status = 'SCHEDULED',
      DateTime? scheduledAt,
    }) {
      return OpenMatchDto(
        id: id,
        sportId: 'sport',
        categoryId: 'cat',
        status: status,
        scheduledAt: scheduledAt ?? DateTime.now().add(const Duration(days: 1)),
        pricePerPlayerCents: 1000,
        maxParticipants: 4,
        participantCount: 2,
        openSpots: 2,
        clubName: 'Club',
        courtName: 'C1',
        locationLabel: null,
      );
    }

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'load emite loading→loaded con mis partidas próximas',
      build: () {
        when(
          () => matchesRepository.listMyMatchesSV(
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          ),
        ).thenAnswer(
          (_) async => OpenMatchesPage(
            items: [match(id: '1')],
            page: 1,
            limit: 50,
            total: 1,
          ),
        );
        return OpenMatchesCubit(matchesRepository: matchesRepository);
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const OpenMatchesLoading(),
        isA<OpenMatchesLoaded>()
            .having((s) => s.segment, 'segment', PartidasSegment.upcoming)
            .having((s) => s.visibleItems.length, 'visibleItems.length', 1),
      ],
    );

    blocTest<OpenMatchesCubit, OpenMatchesState>(
      'setSegment history filtra partidas finalizadas',
      build: () {
        when(
          () => matchesRepository.listMyMatchesSV(
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          ),
        ).thenAnswer(
          (_) async => OpenMatchesPage(
            items: [
              match(id: 'upcoming', scheduledAt: DateTime.now().add(const Duration(days: 2))),
              match(
                id: 'done',
                status: 'FINISHED',
                scheduledAt: DateTime.now().subtract(const Duration(days: 2)),
              ),
            ],
            page: 1,
            limit: 50,
            total: 2,
          ),
        );
        return OpenMatchesCubit(matchesRepository: matchesRepository);
      },
      act: (cubit) async {
        await cubit.load();
        cubit.setSegment(PartidasSegment.history);
      },
      verify: (cubit) {
        final loaded = cubit.state as OpenMatchesLoaded;
        expect(loaded.segment, PartidasSegment.history);
        expect(loaded.visibleItems.length, 1);
        expect(loaded.visibleItems.first.id, 'done');
      },
    );
  });
}
