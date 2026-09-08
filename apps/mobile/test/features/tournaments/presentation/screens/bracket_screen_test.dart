import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/bracket_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/screens/bracket_screen.dart';

class _TestTournamentsRepository implements TournamentsRepository {
  final Future<BracketDto> Function()? bracketProvider;

  _TestTournamentsRepository({this.bracketProvider});

  @override
  Future<BracketDto> getBracket({required String tournamentId}) {
    if (bracketProvider != null) {
      return bracketProvider!();
    }
    throw UnimplementedError();
  }

  @override
  noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('BracketScreen', () {
    Widget buildTestWidget(TournamentsRepository repository) => MaterialApp(
      home: Scaffold(
        body: BracketScreen(
          tournamentId: 't-1',
          tournamentsRepository: repository,
        ),
      ),
    );

    testWidgets('displays bracket data when loaded successfully', (
      tester,
    ) async {
      final bracket = BracketDto(
        tournamentId: 't-1',
        tournamentName: 'Test Tournament',
        totalRounds: 2,
        bracketSize: 4,
        rounds: [
          BracketRoundDto(
            roundNumber: 1,
            name: 'Semifinales',
            matches: [
              BracketMatchDto(
                matchNumber: 1,
                roundNumber: 1,
                playerA: BracketPlayerDto(
                  userId: 'u-1',
                  displayName: 'Player A',
                  seedPosition: 1,
                ),
                playerB: BracketPlayerDto(
                  userId: 'u-2',
                  displayName: 'Player B',
                  seedPosition: 4,
                ),
                winnerId: null,
                score: null,
                status: 'PENDING',
                matchId: 'm-1',
              ),
            ],
          ),
        ],
      );

      final repository = _TestTournamentsRepository(
        bracketProvider: () async => bracket,
      );

      await tester.pumpWidget(buildTestWidget(repository));
      await tester.pumpAndSettle();

      expect(find.text('Test Tournament'), findsOneWidget);
      expect(find.text('Semifinales'), findsOneWidget);
      expect(find.text('Player A'), findsOneWidget);
      expect(find.text('Player B'), findsOneWidget);
    });

    testWidgets('shows BYE match correctly', (tester) async {
      final bracket = BracketDto(
        tournamentId: 't-1',
        tournamentName: 'Test',
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
                playerA: null,
                playerB: null,
                winnerId: null,
                score: null,
                status: 'BYE',
                matchId: 'm-1',
              ),
            ],
          ),
        ],
      );

      final repository = _TestTournamentsRepository(
        bracketProvider: () async => bracket,
      );

      await tester.pumpWidget(buildTestWidget(repository));
      await tester.pumpAndSettle();

      expect(find.text('Bye'), findsOneWidget);
    });

    testWidgets('shows winner checkmark on completed match', (tester) async {
      final bracket = BracketDto(
        tournamentId: 't-1',
        tournamentName: 'Test',
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
                playerA: BracketPlayerDto(
                  userId: 'u-1',
                  displayName: 'Winner',
                  seedPosition: 1,
                ),
                playerB: BracketPlayerDto(
                  userId: 'u-2',
                  displayName: 'Loser',
                  seedPosition: 2,
                ),
                winnerId: 'u-1',
                score: [
                  {'playerAScore': '6', 'playerBScore': '4'},
                ],
                status: 'COMPLETED',
                matchId: 'm-1',
              ),
            ],
          ),
        ],
      );

      final repository = _TestTournamentsRepository(
        bracketProvider: () async => bracket,
      );

      await tester.pumpWidget(buildTestWidget(repository));
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.check_circle), findsOneWidget);
      expect(find.text('6-4'), findsOneWidget);
    });

    testWidgets('horizontal scroll works for multiple rounds', (tester) async {
      tester.view.physicalSize = const Size(400, 800);
      addTearDown(tester.view.resetPhysicalSize);

      final bracket = BracketDto(
        tournamentId: 't-1',
        tournamentName: 'Test',
        totalRounds: 3,
        bracketSize: 8,
        rounds: [
          for (int i = 1; i <= 3; i++)
            BracketRoundDto(
              roundNumber: i,
              name: 'Ronda $i',
              matches: [
                BracketMatchDto(
                  matchNumber: i,
                  roundNumber: i,
                  playerA: BracketPlayerDto(
                    userId: 'u-$i',
                    displayName: 'Player $i',
                    seedPosition: i,
                  ),
                  playerB: null,
                  winnerId: null,
                  score: null,
                  status: 'PENDING',
                  matchId: 'm-$i',
                ),
              ],
            ),
        ],
      );

      final repository = _TestTournamentsRepository(
        bracketProvider: () async => bracket,
      );

      await tester.pumpWidget(buildTestWidget(repository));
      await tester.pumpAndSettle();

      expect(find.text('Ronda 1'), findsOneWidget);
      expect(find.text('Ronda 2'), findsOneWidget);
      expect(find.text('Ronda 3'), findsOneWidget);
    });
  });
}
