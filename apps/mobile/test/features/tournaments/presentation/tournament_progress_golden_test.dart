import 'dart:async';
import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
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
  _BracketRepository({this.scenario = 'finished'});
  final String scenario;
  @override
  Future<BracketDto> getBracket({required String tournamentId}) async {
    if (scenario == 'loading') return Completer<BracketDto>().future;
    if (scenario == 'empty') {
      throw const AppFailure(
        code: 'VALIDACION_FALLIDA',
        message: 'Faltan inscritos',
      );
    }
    if (scenario == 'unsupported') {
      throw const AppFailure(
        code: 'FORMATO_NO_SOPORTADO',
        message: 'No disponible',
      );
    }
    if (scenario == 'error') {
      throw const AppFailure(
        code: 'OFFLINE',
        message: 'No se pudo cargar el cuadro.',
      );
    }
    return BracketDto(
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
              playerB: scenario == 'unresolved' || scenario == 'bye'
                  ? null
                  : const BracketPlayerDto(
                      registrationId: 'reg-b',
                      userId: 'user-b',
                      displayName: 'Beto',
                      seedPosition: 2,
                    ),
              winnerId: scenario == 'finished' || scenario == 'bye'
                  ? 'reg-a'
                  : null,
              score: scenario != 'finished'
                  ? null
                  : const [
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
              status: scenario == 'bye'
                  ? 'BYE'
                  : scenario == 'live'
                  ? 'IN_PROGRESS'
                  : scenario == 'finished'
                  ? 'COMPLETED'
                  : 'PENDING',
              matchId: 'match-1',
            ),
          ],
        ),
      ],
    );
  }

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
    for (final scenario in [
      'loading',
      'empty',
      'unsupported',
      'error',
      'unresolved',
      'bye',
      'pending',
      'live',
    ]) {
      testWidgets('bracket $scenario ${brightness.name}', (tester) async {
        await pumpTournamentGolden(
          tester,
          brightness: brightness,
          child: Scaffold(
            body: BracketScreen(
              tournamentId: 't-1',
              tournamentsRepository: _BracketRepository(scenario: scenario),
            ),
          ),
        );
        await tester.pump(const Duration(milliseconds: 300));
        if (scenario == 'loading') {
          expect(find.byType(CircularProgressIndicator), findsOneWidget);
        } else if (scenario == 'empty') {
          expect(find.text('Todavía no hay cuadro'), findsOneWidget);
        } else if (scenario == 'unsupported') {
          expect(find.text('Este torneo no arma cuadro'), findsOneWidget);
        } else if (scenario == 'error') {
          expect(find.text('No se pudo cargar el cuadro.'), findsOneWidget);
        } else if (scenario == 'unresolved') {
          expect(find.text('Por definir'), findsOneWidget);
        } else if (scenario == 'bye') {
          expect(find.text('Bye'), findsOneWidget);
        } else {
          expect(
            find.text(scenario == 'live' ? 'EN JUEGO' : 'Pendiente'),
            findsOneWidget,
          );
        }
        expect(tester.takeException(), isNull);
        await expectLater(
          find.byKey(tournamentGoldenKey),
          matchesGoldenFile(
            'goldens/bracket_${scenario}_${brightness.name}.png',
          ),
        );
      });
    }
    for (final scenario in ['tied', 'doubles_guests', 'submitting', 'error']) {
      testWidgets('result $scenario ${brightness.name}', (tester) async {
        const doubles = TournamentScheduleMatchDto(
          id: 'sched-2',
          label: 'Ana · Luz vs Beto · Sol',
          status: 'IN_PROGRESS',
          matchId: 'match-2',
          sides: [
            TournamentScheduleMatchSideDto(
              sideKey: 'a',
              userIds: [null, null],
              registrationIds: ['reg-a', 'reg-c'],
            ),
            TournamentScheduleMatchSideDto(
              sideKey: 'b',
              userIds: ['user-b', null],
              registrationIds: ['reg-b', 'reg-d'],
            ),
          ],
        );
        await pumpTournamentGolden(
          tester,
          brightness: brightness,
          child: Scaffold(
            body: ResultEntrySheet(
              match: scenario == 'doubles_guests' ? doubles : _liveMatch,
              roundName: 'Final',
              onSubmit: (_) async {
                if (scenario == 'submitting') await Completer<void>().future;
                if (scenario == 'error') {
                  throw const AppFailure(
                    code: 'OFFLINE',
                    message: 'No se pudo guardar el resultado.',
                  );
                }
              },
            ),
          ),
        );
        await tester.pumpAndSettle();
        final steppers = find.byType(CountStepper);
        for (var i = 0; i < (scenario == 'tied' ? 2 : 1); i++) {
          await tester.tap(
            find
                .descendant(
                  of: steppers.at(i),
                  matching: find.byType(GestureDetector),
                )
                .last,
          );
          await tester.pump();
        }
        if (scenario == 'submitting' || scenario == 'error') {
          await tester.tap(find.text('Guardar resultado'));
          await tester.pump(const Duration(milliseconds: 300));
        }
        if (scenario == 'tied') {
          expect(
            find.text('El resultado debe definir un ganador.'),
            findsOneWidget,
          );
          expect(
            tester
                .widget<FilledButton>(find.bySubtype<FilledButton>())
                .onPressed,
            isNull,
          );
        } else if (scenario == 'submitting') {
          expect(find.byType(CircularProgressIndicator), findsOneWidget);
        } else if (scenario == 'error') {
          expect(find.text('No se pudo guardar el resultado.'), findsOneWidget);
        } else {
          expect(find.byType(CountStepper), findsNWidgets(2));
          expect(find.text('Ana · Luz'), findsOneWidget);
        }
        expect(tester.takeException(), isNull);
        await expectLater(
          find.byKey(tournamentGoldenKey),
          matchesGoldenFile(
            'goldens/result_${scenario}_${brightness.name}.png',
          ),
        );
      });
    }
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
      expect(tester.takeException(), isNull);
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
      expect(tester.takeException(), isNull);
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
