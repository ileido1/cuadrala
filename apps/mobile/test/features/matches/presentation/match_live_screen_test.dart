import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/theme/app_icons.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/match_live_screen.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

const _matchId = 'match-1';

//? scheduledAt null deja el cronómetro en 0 sin depender de DateTime.now().
MatchDetailDto _buildMatch() {
  final at = DateTime(2030, 6, 1, 19);
  return MatchDetailDto(
    id: _matchId,
    sportId: 'sport',
    categoryId: 'cat',
    type: 'REGULAR',
    status: 'IN_PROGRESS',
    scheduledAt: null,
    pricePerPlayerCents: 0,
    maxParticipants: 4,
    participantCount: 4,
    openSpots: 0,
    courtId: null,
    clubName: 'Club Cuádrala',
    courtName: 'Cancha 1',
    locationLabel: 'Las Mercedes, Caracas',
    tournamentId: null,
    participants: const [],
    createdAt: at,
    updatedAt: at,
  );
}

Widget _buildTestApp() {
  final router = GoRouter(
    initialLocation: '/matches/$_matchId/live',
    routes: [
      GoRoute(
        path: '/partidas',
        builder: (context, state) =>
            const Scaffold(body: Text('Partidas page')),
      ),
      GoRoute(
        path: '/matches/:matchId/live',
        builder: (context, state) =>
            MatchLiveScreen(matchId: state.pathParameters['matchId']!),
      ),
      GoRoute(
        path: '/matches/:matchId/result',
        builder: (context, state) => Scaffold(
          body: Text('Result entry: ${state.pathParameters['matchId']}'),
        ),
      ),
    ],
  );
  return MaterialApp.router(routerConfig: router);
}

//? Issue #116: match_live_screen.dart no tenía ningún test de widget.
//? Cubre carga, no encontrada, error con reintento, el cronómetro que avanza
//? por segundo, la navegación a la carga de resultado y el botón de volver.
void main() {
  late _MockMatchesRepository matchesRepository;

  setUp(() {
    matchesRepository = _MockMatchesRepository();
    getIt.registerSingleton<MatchesRepository>(matchesRepository);
  });

  tearDown(() {
    getIt.unregister<MatchesRepository>();
  });

  //? El cubit deja dos Timer.periodic vivos; desmontar el árbol lo cierra
  //? y evita el error de "Timer still pending" al terminar cada test.
  Future<void> unmount(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox.shrink());
  }

  testWidgets('should show a spinner when the match is still loading', (
    tester,
  ) async {
    final pending = Completer<MatchDetailDto?>();
    when(
      () => matchesRepository.getMatchDetail(_matchId),
    ).thenAnswer((_) => pending.future);

    await tester.pumpWidget(_buildTestApp());
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    pending.complete(null);
    await tester.pumpAndSettle();
    await unmount(tester);
  });

  testWidgets('should show not found when the match does not exist', (
    tester,
  ) async {
    when(
      () => matchesRepository.getMatchDetail(_matchId),
    ).thenAnswer((_) async => null);

    await tester.pumpWidget(_buildTestApp());
    await tester.pumpAndSettle();

    expect(find.text('Partida no encontrada'), findsOneWidget);
    await unmount(tester);
  });

  testWidgets('should show the error and reload when retry is tapped', (
    tester,
  ) async {
    var calls = 0;
    when(() => matchesRepository.getMatchDetail(_matchId)).thenAnswer((
      _,
    ) async {
      calls++;
      if (calls == 1) throw Exception('boom');
      return _buildMatch();
    });

    await tester.pumpWidget(_buildTestApp());
    await tester.pumpAndSettle();
    expect(find.text('No se pudo cargar la partida en vivo.'), findsOneWidget);

    await tester.tap(find.text('Reintentar'));
    await tester.pumpAndSettle();

    expect(find.text('No se pudo cargar la partida en vivo.'), findsNothing);
    expect(find.text('Tiempo transcurrido'), findsOneWidget);
    await unmount(tester);
  });

  testWidgets('should render timer and teams when the match is loaded', (
    tester,
  ) async {
    when(
      () => matchesRepository.getMatchDetail(_matchId),
    ).thenAnswer((_) async => _buildMatch());

    await tester.pumpWidget(_buildTestApp());
    await tester.pumpAndSettle();

    expect(find.text('Partido en vivo'), findsOneWidget);
    expect(find.text('00:00:00'), findsOneWidget);
    expect(find.text('Equipo A'), findsOneWidget);
    expect(find.text('Equipo B'), findsOneWidget);
    expect(find.text('Terminar partido'), findsOneWidget);
    await unmount(tester);
  });

  testWidgets('should advance the timer every second when the match is live', (
    tester,
  ) async {
    when(
      () => matchesRepository.getMatchDetail(_matchId),
    ).thenAnswer((_) async => _buildMatch());

    await tester.pumpWidget(_buildTestApp());
    await tester.pumpAndSettle();

    await tester.pump(const Duration(seconds: 1));
    expect(find.text('00:00:01'), findsOneWidget);

    await tester.pump(const Duration(seconds: 61));
    expect(find.text('00:01:02'), findsOneWidget);
    await unmount(tester);
  });

  testWidgets('should open the result entry when Terminar partido is tapped', (
    tester,
  ) async {
    when(
      () => matchesRepository.getMatchDetail(_matchId),
    ).thenAnswer((_) async => _buildMatch());

    await tester.pumpWidget(_buildTestApp());
    await tester.pumpAndSettle();

    await tester.tap(find.text('Terminar partido'));
    await tester.pumpAndSettle();

    expect(find.text('Result entry: $_matchId'), findsOneWidget);
    await unmount(tester);
  });

  testWidgets(
    'should open the result entry only once when the timer keeps ticking',
    (tester) async {
      when(
        () => matchesRepository.getMatchDetail(_matchId),
      ).thenAnswer((_) async => _buildMatch());

      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Terminar partido'));
      await tester.pumpAndSettle();
      //? Cada tick del timer emite un estado nuevo; no debe apilar otra página.
      for (var i = 0; i < 3; i++) {
        await tester.pump(const Duration(seconds: 1));
      }
      await tester.pumpAndSettle();

      expect(
        find.text('Result entry: $_matchId', skipOffstage: false),
        findsOneWidget,
      );
      await unmount(tester);
    },
  );

  testWidgets('should go to partidas when back is tapped without history', (
    tester,
  ) async {
    when(
      () => matchesRepository.getMatchDetail(_matchId),
    ).thenAnswer((_) async => _buildMatch());

    await tester.pumpWidget(_buildTestApp());
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(AppIcons.arrowBack));
    await tester.pumpAndSettle();

    expect(find.text('Partidas page'), findsOneWidget);
    await unmount(tester);
  });
}
