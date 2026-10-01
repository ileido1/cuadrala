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

  testWidgets('blocks tied scores for known and unknown formats', (
    tester,
  ) async {
    for (final format in [
      'SINGLE_ELIMINATION',
      'ROUND_ROBIN',
      'AMERICANO',
      'GROUPS_PLUS_KNOCKOUT',
      'UNKNOWN',
      null,
    ]) {
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
        isNull,
        reason: 'equal scores must be blocked for $format',
      );
      await tester.pumpWidget(const SizedBox.shrink());
    }

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

  testWidgets('shows generic guidance instead of format-specific tie rules', (
    tester,
  ) async {
    for (final format in ['SINGLE_ELIMINATION', 'AMERICANO', 'UNKNOWN', null]) {
      await pumpSheet(
        tester,
        match: singlesMatch,
        formatPresetName: format,
        onSubmit: (_) async {},
      );
      expect(
        find.text('El resultado debe definir un ganador.'),
        findsOneWidget,
      );
      expect(find.textContaining('En americano'), findsNothing);
      expect(find.textContaining('eliminación'), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
    }
  });

  testWidgets('allows submission once side totals are unequal', (tester) async {
    await pumpSheet(
      tester,
      match: singlesMatch,
      formatPresetName: 'ROUND_ROBIN',
      onSubmit: (_) async {},
    );
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
  });

  testWidgets('blocks equal doubles side totals regardless of format', (
    tester,
  ) async {
    const doublesMatch = TournamentScheduleMatchDto(
      id: 'sched-doubles',
      label: 'Pareja A vs Pareja B',
      status: '',
      matchId: 'match-doubles',
      sides: [
        TournamentScheduleMatchSideDto(sideKey: 'a', userIds: ['u1', 'u2']),
        TournamentScheduleMatchSideDto(sideKey: 'b', userIds: ['u3', 'u4']),
      ],
    );
    await pumpSheet(
      tester,
      match: doublesMatch,
      formatPresetName: 'AMERICANO',
      onSubmit: (_) async {},
    );
    expect(
      tester
          .widget<FilledButton>(
            find.byKey(const Key('tournament.resultEntrySheet.submit')),
          )
          .onPressed,
      isNull,
    );
  });

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

    final plusButtons = find.descendant(
      of: find.byType(CountStepper).first,
      matching: find.byType(GestureDetector),
    );
    await tester.tap(plusButtons.last);
    await tester.pump();

    await tester.tap(
      find.byKey(const Key('tournament.resultEntrySheet.submit')),
    );
    await tester.pumpAndSettle();

    expect(submitted, const [
      TournamentScheduleMatchScoreDto(
        tournamentRegistrationId: 'reg-user',
        points: 1,
      ),
      TournamentScheduleMatchScoreDto(
        tournamentRegistrationId: 'reg-guest',
        points: 0,
      ),
    ]);
    expect(submitted!.first.userId, isNull);
    expect(submitted!.last.userId, isNull);
  });

  testWidgets('shows backend errors and keeps the sheet open', (tester) async {
    await pumpSheet(
      tester,
      match: singlesMatch,
      onSubmit: (_) async {
        throw const AppFailure(
          code: 'RESULTADO_INVALIDO',
          message: 'No se pudo guardar el resultado.',
        );
      },
    );

    final plusButtons = find.descendant(
      of: find.byType(CountStepper).first,
      matching: find.byType(GestureDetector),
    );
    await tester.tap(plusButtons.last);
    await tester.pump();

    await tester.tap(
      find.byKey(const Key('tournament.resultEntrySheet.submit')),
    );
    await tester.pumpAndSettle();

    expect(find.text('No se pudo guardar el resultado.'), findsOneWidget);
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

      final plusButtons = find.descendant(
        of: find.byType(CountStepper).first,
        matching: find.byType(GestureDetector),
      );
      await tester.tap(plusButtons.last);
      await tester.pump();

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
