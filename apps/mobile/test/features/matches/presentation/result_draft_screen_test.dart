import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/theme/app_icons.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/result_draft_screen.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

const _matchId = 'match-123456789';

MatchDetailDto _buildMatch({
  List<String> userIds = const ['user-aaaaaaaa1', 'user-bbbbbbbb2'],
}) {
  final fixed = DateTime(2030, 6, 1, 12);
  return MatchDetailDto(
    id: _matchId,
    sportId: 'sport',
    categoryId: 'cat',
    type: 'REGULAR',
    status: 'FINISHED',
    scheduledAt: fixed,
    pricePerPlayerCents: 0,
    maxParticipants: 4,
    participantCount: userIds.length,
    openSpots: 4 - userIds.length,
    courtId: null,
    clubName: 'Club Cuádrala',
    courtName: 'Cancha 1',
    locationLabel: 'Las Mercedes, Caracas',
    tournamentId: null,
    participants: [
      for (final id in userIds)
        MatchParticipantDto(userId: id, joinedAt: fixed),
    ],
    createdAt: fixed,
    updatedAt: fixed,
  );
}

//? Arranca en '/' y empuja la pantalla, para que el `context.pop()` del envío
//? exitoso tenga a dónde volver.
Future<void> _pumpScreen(WidgetTester tester, {bool settle = true}) async {
  final router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => const Scaffold(body: Text('home')),
      ),
      GoRoute(
        path: '/draft',
        builder: (_, _) => const ResultDraftScreen(matchId: _matchId),
      ),
    ],
  );
  await tester.pumpWidget(MaterialApp.router(routerConfig: router));
  unawaited(router.push('/draft'));
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
    await tester.pump();
  }
}

Finder _rowButton(String userId, IconData icon) => find.descendant(
  of: find.ancestor(
    of: find.text('Usuario ${userId.substring(0, 8)}…'),
    matching: find.byType(ListTile),
  ),
  matching: find.widgetWithIcon(IconButton, icon),
);

void _stubUpsert(_MockMatchesRepository repository) {
  when(
    () => repository.upsertResultDraft(
      matchId: any(named: 'matchId'),
      scores: any(named: 'scores'),
    ),
  ).thenAnswer((_) async {});
}

//? Issue #116: result_draft_screen.dart no tenía ningún test de widget.
//? Cubre carga, error con reintento, contador de puntos por jugador y el
//? envío de la propuesta con su feedback de éxito y de error.
void main() {
  late _MockMatchesRepository repository;

  setUp(() {
    repository = _MockMatchesRepository();
    getIt.registerSingleton<MatchesRepository>(repository);
    when(
      () => repository.getMatchById(_matchId),
    ).thenAnswer((_) async => _buildMatch());
  });

  tearDown(() => getIt.unregister<MatchesRepository>());

  testWidgets('should show a spinner when the match is still loading', (
    tester,
  ) async {
    final pending = Completer<MatchDetailDto>();
    when(
      () => repository.getMatchById(_matchId),
    ).thenAnswer((_) => pending.future);

    await _pumpScreen(tester, settle: false);

    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    pending.complete(_buildMatch());
    await tester.pumpAndSettle();
  });

  testWidgets(
    'should show the error state and reload when tapping Reintentar',
    (tester) async {
      when(
        () => repository.getMatchById(_matchId),
      ).thenThrow(Exception('boom'));

      await _pumpScreen(tester);
      expect(find.text('No se pudo cargar la partida.'), findsOneWidget);

      when(
        () => repository.getMatchById(_matchId),
      ).thenAnswer((_) async => _buildMatch());
      await tester.tap(find.text('Reintentar'));
      await tester.pumpAndSettle();

      verify(() => repository.getMatchById(_matchId)).called(2);
      expect(find.text('Puntos por jugador'), findsOneWidget);
    },
  );

  testWidgets('should list every participant with zero points when loaded', (
    tester,
  ) async {
    await _pumpScreen(tester);

    expect(find.text('Partida match-12…'), findsOneWidget);
    expect(find.text('Usuario user-aaa…'), findsOneWidget);
    expect(find.text('Usuario user-bbb…'), findsOneWidget);
    expect(find.text('0'), findsNWidgets(2));
    final minus = tester.widget<IconButton>(
      _rowButton('user-aaaaaaaa1', AppIcons.removeCircle),
    );
    expect(minus.onPressed, isNull);
  });

  testWidgets(
    'should change only that player points when tapping plus and minus',
    (tester) async {
      await _pumpScreen(tester);

      final plus = _rowButton('user-aaaaaaaa1', AppIcons.addCircle);
      await tester.tap(plus);
      await tester.pump();
      await tester.tap(plus);
      await tester.pump();
      expect(find.text('2'), findsOneWidget);
      expect(find.text('0'), findsOneWidget);

      await tester.tap(_rowButton('user-aaaaaaaa1', AppIcons.removeCircle));
      await tester.pump();
      expect(find.text('1'), findsOneWidget);
      expect(find.text('0'), findsOneWidget);
    },
  );

  testWidgets(
    'should send the scores, confirm and go back when submit succeeds',
    (tester) async {
      _stubUpsert(repository);

      await _pumpScreen(tester);
      await tester.tap(_rowButton('user-bbbbbbbb2', AppIcons.addCircle));
      await tester.pump();
      await tester.tap(find.text('Enviar propuesta'));
      await tester.pumpAndSettle();

      final captured =
          verify(
                () => repository.upsertResultDraft(
                  matchId: _matchId,
                  scores: captureAny(named: 'scores'),
                ),
              ).captured.single
              as List<Map<String, Object?>>;
      expect(captured, [
        {'userId': 'user-aaaaaaaa1', 'points': 0},
        {'userId': 'user-bbbbbbbb2', 'points': 1},
      ]);
      expect(find.text('Resultado enviado para confirmación.'), findsOneWidget);
      expect(find.text('home'), findsOneWidget);
      expect(find.byKey(const Key('result.draft.screen')), findsNothing);
    },
  );

  testWidgets('should show the error and stay on screen when submit fails', (
    tester,
  ) async {
    when(
      () => repository.upsertResultDraft(
        matchId: any(named: 'matchId'),
        scores: any(named: 'scores'),
      ),
    ).thenThrow(Exception('boom'));

    await _pumpScreen(tester);
    await tester.tap(find.text('Enviar propuesta'));
    await tester.pumpAndSettle();

    expect(
      find.text('No se pudo enviar el resultado: Exception: boom'),
      findsOneWidget,
    );
    expect(find.byKey(const Key('result.draft.screen')), findsOneWidget);
    expect(find.text('Enviar propuesta'), findsOneWidget);
  });

  testWidgets('should warn and not submit when the match has no participants', (
    tester,
  ) async {
    when(
      () => repository.getMatchById(_matchId),
    ).thenAnswer((_) async => _buildMatch(userIds: const []));
    _stubUpsert(repository);

    await _pumpScreen(tester);
    await tester.tap(find.text('Enviar propuesta'));
    await tester.pump();

    expect(
      find.text('No hay jugadores para cargar resultado.'),
      findsOneWidget,
    );
    verifyNever(
      () => repository.upsertResultDraft(
        matchId: any(named: 'matchId'),
        scores: any(named: 'scores'),
      ),
    );
  });
}
