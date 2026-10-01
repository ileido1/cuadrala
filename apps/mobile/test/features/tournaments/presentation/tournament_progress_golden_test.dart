import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/bracket_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_schedule_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/screens/bracket_screen.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/result_entry_sheet.dart';
import 'package:cuadrala_mobile/src/shared/widgets/count_stepper.dart';
import '../goldens/tournament_golden.dart';

class _BracketRepository implements TournamentsRepository {
  @override
  Future<BracketDto> getBracket({required String tournamentId}) async =>
      BracketDto(
        tournamentId: tournamentId,
        tournamentName: 'Copa Cuádrala',
        totalRounds: 1,
        bracketSize: 2,
        rounds: [
          BracketRoundDto(
            roundNumber: 1,
            name: 'Finales',
            matches: [
              BracketMatchDto(
                matchNumber: 1,
                roundNumber: 1,
                playerA: const BracketPlayerDto(
                  registrationId: 'reg-a',
                  userId: null,
                  displayName: 'Ana invitada',
                  seedPosition: 1,
                ),
                playerB: const BracketPlayerDto(
                  registrationId: 'reg-b',
                  userId: 'user-b',
                  displayName: 'Beto',
                  seedPosition: 2,
                ),
                winnerId: 'reg-a',
                score: const [
                  BracketScoreEntryDto(
                    userId: null,
                    tournamentRegistrationId: 'reg-a',
                    points: 6,
                  ),
                  BracketScoreEntryDto(
                    userId: 'user-b',
                    tournamentRegistrationId: 'reg-b',
                    points: 3,
                  ),
                ],
                status: 'COMPLETED',
                matchId: 'match-1',
              ),
            ],
          ),
        ],
      );

  @override
  noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

const _liveMatch = TournamentScheduleMatchDto(
  id: 'sched-1',
  label: 'Ana invitada vs Beto',
  status: 'IN_PROGRESS',
  matchId: 'match-1',
  courtName: 'Central',
  sides: [
    TournamentScheduleMatchSideDto(
      sideKey: 'a',
      userIds: [null],
      registrationIds: ['reg-a'],
    ),
    TournamentScheduleMatchSideDto(
      sideKey: 'b',
      userIds: ['user-b'],
      registrationIds: ['reg-b'],
    ),
  ],
);

void main() {
  setUpAll(loadTournamentGoldenFonts);

  for (final brightness in Brightness.values) {
    testWidgets('zero result entry should match ${brightness.name}', (
      tester,
    ) async {
      await pumpTournamentGolden(
        tester,
        brightness: brightness,
        child: Scaffold(
          body: ResultEntrySheet(
            match: _liveMatch,
            roundName: 'Final',
            onSubmit: (_) async {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      await expectLater(
        find.byKey(tournamentGoldenKey),
        matchesGoldenFile('goldens/progress_zero_${brightness.name}.png'),
      );
    });

    testWidgets('live result entry should match ${brightness.name}', (
      tester,
    ) async {
      await pumpTournamentGolden(
        tester,
        brightness: brightness,
        child: Scaffold(
          body: ResultEntrySheet(
            match: _liveMatch,
            roundName: 'Final',
            onSubmit: (_) async {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      final firstStepper = find.byType(CountStepper).first;
      final plusButton = find
          .descendant(of: firstStepper, matching: find.byType(GestureDetector))
          .last;
      for (var i = 0; i < 5; i++) {
        await tester.tap(plusButton);
        await tester.pump();
      }
      await tester.pumpAndSettle();
      await expectLater(
        find.byKey(tournamentGoldenKey),
        matchesGoldenFile('goldens/progress_live_${brightness.name}.png'),
      );
    });

    testWidgets(
      'finished bracket with guest result should match ${brightness.name}',
      (tester) async {
        await pumpTournamentGolden(
          tester,
          brightness: brightness,
          child: Scaffold(
            body: BracketScreen(
              tournamentId: 't-1',
              tournamentsRepository: _BracketRepository(),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await expectLater(
          find.byKey(tournamentGoldenKey),
          matchesGoldenFile('goldens/progress_finished_${brightness.name}.png'),
        );
      },
    );
  }
}
