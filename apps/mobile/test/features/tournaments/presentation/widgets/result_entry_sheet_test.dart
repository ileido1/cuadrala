import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_schedule_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/result_entry_sheet.dart';
import 'package:cuadrala_mobile/src/shared/widgets/count_stepper.dart';

void main() {
  Future<void> pumpSheet(
    WidgetTester tester, {
    required TournamentScheduleMatchDto match,
    required Future<void> Function(List<TournamentScheduleMatchScoreDto>) onSubmit,
    String roundName = 'Semifinal',
  }) {
    return tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ResultEntrySheet(
            match: match,
            roundName: roundName,
            onSubmit: onSubmit,
          ),
        ),
      ),
    );
  }

  final singlesMatch = const TournamentScheduleMatchDto(
    id: 'sched-1',
    label: 'Daniel R. vs Luis P.',
    status: '',
    matchId: 'match-1',
    courtName: 'Central',
    sides: [
      TournamentScheduleMatchSideDto(sideKey: 'a', userIds: ['u1']),
      TournamentScheduleMatchSideDto(sideKey: 'b', userIds: ['u2']),
    ],
  );

  testWidgets('renders the title, subtitle and one stepper per side', (
    tester,
  ) async {
    await pumpSheet(tester, match: singlesMatch, onSubmit: (_) async {});

    expect(find.text('Cargar resultado'), findsOneWidget);
    expect(find.text('Semifinal · Central'), findsOneWidget);
    expect(find.byType(CountStepper), findsNWidgets(2));
  });

  testWidgets(
    'submits one score per side reflecting the stepper values',
    (tester) async {
      List<TournamentScheduleMatchScoreDto>? submitted;
      await pumpSheet(
        tester,
        match: singlesMatch,
        onSubmit: (scores) async {
          submitted = scores;
        },
      );

      // Bump side "a"'s stepper to 6.
      final plusButtons = find.descendant(
        of: find.byType(CountStepper).first,
        matching: find.byType(GestureDetector),
      );
      for (var i = 0; i < 6; i++) {
        await tester.tap(plusButtons.last);
        await tester.pump();
      }

      await tester.tap(find.byKey(const Key('tournament.resultEntrySheet.submit')));
      await tester.pumpAndSettle();

      expect(submitted, isNotNull);
      expect(
        submitted,
        containsAll([
          const TournamentScheduleMatchScoreDto(userId: 'u1', points: 6),
          const TournamentScheduleMatchScoreDto(userId: 'u2', points: 0),
        ]),
      );
    },
  );

  testWidgets(
    'excludes guest sides (null userId) from the submitted scores',
    (tester) async {
      const matchWithGuest = TournamentScheduleMatchDto(
        id: 'sched-2',
        label: 'Daniel R. vs Invitado',
        status: '',
        matchId: 'match-2',
        sides: [
          TournamentScheduleMatchSideDto(sideKey: 'a', userIds: ['u1']),
          TournamentScheduleMatchSideDto(sideKey: 'b', userIds: [null]),
        ],
      );
      List<TournamentScheduleMatchScoreDto>? submitted;
      await pumpSheet(
        tester,
        match: matchWithGuest,
        onSubmit: (scores) async {
          submitted = scores;
        },
      );

      await tester.tap(find.byKey(const Key('tournament.resultEntrySheet.submit')));
      await tester.pumpAndSettle();

      expect(submitted, [
        const TournamentScheduleMatchScoreDto(userId: 'u1', points: 0),
      ]);
    },
  );

  testWidgets('shows the API error message and keeps the sheet open on failure', (
    tester,
  ) async {
    await pumpSheet(
      tester,
      match: singlesMatch,
      onSubmit: (_) async {
        throw const AppFailure(
          code: 'RESULTADO_YA_CARGADO',
          message: 'Este partido ya tiene un resultado cargado.',
        );
      },
    );

    await tester.tap(find.byKey(const Key('tournament.resultEntrySheet.submit')));
    await tester.pumpAndSettle();

    expect(
      find.text('Este partido ya tiene un resultado cargado.'),
      findsOneWidget,
    );
    expect(find.text('Cargar resultado'), findsOneWidget);
  });
}
