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
    required Future<void> Function(List<TournamentScheduleMatchScoreDto>)
    onSubmit,
    String roundName = 'Semifinal',
    String? formatPresetName,
  }) {
    return tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ResultEntrySheet(
            match: match,
            roundName: roundName,
            formatPresetName: formatPresetName,
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

  testWidgets('blocks tied score only for single elimination', (tester) async {
    var submitCount = 0;
    await pumpSheet(
      tester,
      match: singlesMatch,
      formatPresetName: 'SINGLE_ELIMINATION',
      onSubmit: (_) async => submitCount++,
    );

    final submit = tester.widget<FilledButton>(
      find.byKey(const Key('tournament.resultEntrySheet.submit')),
    );
    expect(submit.onPressed, isNull);

    final plusButtons = find.descendant(
      of: find.byType(CountStepper).first,
      matching: find.byType(GestureDetector),
    );
    await tester.tap(plusButtons.last);
    await tester.pump();
    expect(
      tester
          .widget<FilledButton>(
            find.byKey(const Key('tournament.resultEntrySheet.submit')),
          )
          .onPressed,
      isNotNull,
    );
    await tester.tap(
      find.byKey(const Key('tournament.resultEntrySheet.submit')),
    );
    await tester.pumpAndSettle();
    expect(submitCount, 1);
  });

  testWidgets(
    'allows tied score for round robin and does not claim GPK tie support',
    (tester) async {
      for (final format in ['ROUND_ROBIN', 'AMERICANO']) {
        await pumpSheet(
          tester,
          match: singlesMatch,
          formatPresetName: format,
          onSubmit: (_) async {},
        );
        expect(
          tester
              .widget<FilledButton>(
                find.byKey(const Key('tournament.resultEntrySheet.submit')),
              )
              .onPressed,
          isNotNull,
        );
        await tester.pumpWidget(const SizedBox.shrink());
      }

      await pumpSheet(
        tester,
        match: singlesMatch,
        formatPresetName: 'GROUPS_PLUS_KNOCKOUT',
        onSubmit: (_) async {},
      );
      expect(find.textContaining('empate'), findsNothing);
      expect(
        tester
            .widget<FilledButton>(
              find.byKey(const Key('tournament.resultEntrySheet.submit')),
            )
            .onPressed,
        isNotNull,
      );
    },
  );

  testWidgets('submits one score per side reflecting the stepper values', (
    tester,
  ) async {
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

    await tester.tap(
      find.byKey(const Key('tournament.resultEntrySheet.submit')),
    );
    await tester.pumpAndSettle();

    expect(submitted, isNotNull);
    expect(
      submitted,
      containsAll([
        const TournamentScheduleMatchScoreDto(userId: 'u1', points: 6),
        const TournamentScheduleMatchScoreDto(userId: 'u2', points: 0),
      ]),
    );
  });

  testWidgets('submits guest scores by registration id when userId is null', (
    tester,
  ) async {
    const matchWithGuest = TournamentScheduleMatchDto(
      id: 'sched-2',
      label: 'Daniel R. vs Invitado',
      status: '',
      matchId: 'match-2',
      sides: [
        TournamentScheduleMatchSideDto(
          sideKey: 'a',
          userIds: ['u1'],
          registrationIds: ['reg-user'],
        ),
        TournamentScheduleMatchSideDto(
          sideKey: 'b',
          userIds: [null],
          registrationIds: ['reg-guest'],
        ),
      ],
    );
    List<TournamentScheduleMatchScoreDto>? submitted;
    await pumpSheet(
      tester,
      match: matchWithGuest,
      onSubmit: (scores) async => submitted = scores,
    );

    await tester.tap(
      find.byKey(const Key('tournament.resultEntrySheet.submit')),
    );
    await tester.pumpAndSettle();

    expect(submitted, const [
      TournamentScheduleMatchScoreDto(
        tournamentRegistrationId: 'reg-user',
        points: 0,
      ),
      TournamentScheduleMatchScoreDto(
        tournamentRegistrationId: 'reg-guest',
        points: 0,
      ),
    ]);
    expect(submitted!.first.userId, isNull);
    expect(submitted!.last.userId, isNull);
  });

  testWidgets('shows the backend tie rejection without local rule copy', (
    tester,
  ) async {
    await pumpSheet(
      tester,
      match: singlesMatch,
      onSubmit: (_) async {
        throw const AppFailure(
          code: 'EMPATE_NO_PERMITIDO',
          message: 'El resultado no permite un empate.',
        );
      },
    );

    await tester.tap(
      find.byKey(const Key('tournament.resultEntrySheet.submit')),
    );
    await tester.pumpAndSettle();

    expect(find.text('El resultado no permite un empate.'), findsOneWidget);
  });

  testWidgets(
    'shows the API error message and keeps the sheet open on failure',
    (tester) async {
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

      await tester.tap(
        find.byKey(const Key('tournament.resultEntrySheet.submit')),
      );
      await tester.pumpAndSettle();

      expect(
        find.text('Este partido ya tiene un resultado cargado.'),
        findsOneWidget,
      );
      expect(find.text('Cargar resultado'), findsOneWidget);
    },
  );
}
