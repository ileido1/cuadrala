import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/confirm_match_result_screen.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

const _matchId = 'match-1';
const _draftId = 'draft-1';

MatchDetailDto _buildMatch() {
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
    participantCount: 0,
    openSpots: 4,
    courtId: null,
    clubName: 'Club Cuádrala',
    courtName: 'Cancha 1',
    locationLabel: 'Las Mercedes, Caracas',
    tournamentId: null,
    participants: const [],
    createdAt: fixed,
    updatedAt: fixed,
  );
}

Map<String, Object?> _draft({String? proposedByName = 'Ana Pérez'}) => {
  'id': _draftId,
  'matchId': _matchId,
  'proposedByUserId': 'u1',
  'proposedByName': proposedByName,
  'teamASetWins': 2,
  'teamBSetWins': 1,
  'teamAPoints': 15,
  'teamBPoints': 9,
};

//? `FilledButton.icon` / `OutlinedButton.icon` crean subclases privadas, por
//? eso se buscan con `bySubtype` y no con `widgetWithText` (tipo exacto).
final _confirmButton = find.ancestor(
  of: find.text('Confirmar resultado'),
  matching: find.bySubtype<FilledButton>(),
);
final _rejectButton = find.ancestor(
  of: find.text('Rechazar'),
  matching: find.bySubtype<OutlinedButton>(),
);

//? Arranca en '/' y empuja la pantalla, para que `context.pop()` tenga a
//? dónde volver y el test pueda verificar la navegación de "Volver".
Future<void> _pumpScreen(WidgetTester tester, {bool settle = true}) async {
  final router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => const Scaffold(body: Text('home')),
      ),
      GoRoute(
        path: '/confirm',
        builder: (_, _) => const ConfirmMatchResultScreen(matchId: _matchId),
      ),
    ],
  );
  await tester.pumpWidget(MaterialApp.router(routerConfig: router));
  unawaited(router.push('/confirm'));
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
    await tester.pump();
  }
}

//? Issue #116: confirm_match_result_screen.dart no tenía ningún test de
//? widget. Cubre los estados (carga, sin borrador, falla, cargado) y las
//? acciones confirmar/rechazar con su feedback de error.
void main() {
  late _MockMatchesRepository repository;

  setUp(() {
    repository = _MockMatchesRepository();
    getIt.registerSingleton<MatchesRepository>(repository);
    when(
      () => repository.getMatchDetail(_matchId),
    ).thenAnswer((_) async => _buildMatch());
    when(
      () => repository.getMatchResultDraft(_matchId),
    ).thenAnswer((_) async => _draft());
  });

  tearDown(() => getIt.unregister<MatchesRepository>());

  testWidgets('should show a spinner when the draft is still loading', (
    tester,
  ) async {
    final pending = Completer<MatchDetailDto?>();
    when(
      () => repository.getMatchDetail(_matchId),
    ).thenAnswer((_) => pending.future);

    await _pumpScreen(tester, settle: false);

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.text('Confirmar resultado'), findsOneWidget); // solo AppBar

    pending.complete(null);
    await tester.pumpAndSettle();
  });

  testWidgets('should show the empty state when the match does not exist', (
    tester,
  ) async {
    when(
      () => repository.getMatchDetail(_matchId),
    ).thenAnswer((_) async => null);

    await _pumpScreen(tester);

    expect(find.text('No hay resultado pendiente'), findsOneWidget);
    verifyNever(() => repository.getMatchResultDraft(any()));
  });

  testWidgets('should go back when tapping Volver in the empty state', (
    tester,
  ) async {
    when(
      () => repository.getMatchResultDraft(_matchId),
    ).thenAnswer((_) async => null);

    await _pumpScreen(tester);
    expect(find.text('No hay resultado pendiente'), findsOneWidget);

    await tester.tap(find.text('Volver'));
    await tester.pumpAndSettle();

    expect(find.text('home'), findsOneWidget);
    expect(find.byKey(const Key('confirm.result')), findsNothing);
  });

  testWidgets(
    'should show the failure message and reload when tapping Reintentar',
    (tester) async {
      when(
        () => repository.getMatchDetail(_matchId),
      ).thenThrow(const AppFailure(code: 'NETWORK', message: 'Sin conexión'));

      await _pumpScreen(tester);
      expect(find.text('Sin conexión'), findsOneWidget);

      when(
        () => repository.getMatchDetail(_matchId),
      ).thenAnswer((_) async => _buildMatch());
      await tester.tap(find.text('Reintentar'));
      await tester.pumpAndSettle();

      verify(() => repository.getMatchDetail(_matchId)).called(2);
      expect(find.text('Ana Pérez'), findsOneWidget);
    },
  );

  testWidgets(
    'should render proposer, sets and points when the draft is loaded',
    (tester) async {
      await _pumpScreen(tester);

      expect(find.text('Resultado propuesto por:'), findsOneWidget);
      expect(find.text('Ana Pérez'), findsOneWidget);
      expect(find.text('Equipo A'), findsOneWidget);
      expect(find.text('Equipo B'), findsOneWidget);
      expect(find.text('2'), findsOneWidget);
      expect(find.text('1'), findsOneWidget);
      expect(find.text('15 pts'), findsOneWidget);
      expect(find.text('9 pts'), findsOneWidget);
    },
  );

  testWidgets('should show a fallback name when the proposer has no name', (
    tester,
  ) async {
    when(
      () => repository.getMatchResultDraft(_matchId),
    ).thenAnswer((_) async => _draft(proposedByName: null));

    await _pumpScreen(tester);

    expect(find.text('Jugador desconocido'), findsOneWidget);
  });

  testWidgets('should confirm the draft when tapping Confirmar resultado', (
    tester,
  ) async {
    when(
      () => repository.confirmMatchResult(
        matchId: any(named: 'matchId'),
        draftId: any(named: 'draftId'),
      ),
    ).thenAnswer((_) async {});

    await _pumpScreen(tester);
    await tester.tap(_confirmButton);
    await tester.pumpAndSettle();

    verify(
      () => repository.confirmMatchResult(matchId: _matchId, draftId: _draftId),
    ).called(1);
    //? Mismo cierre que result_draft_screen: aviso y vuelta atrás.
    expect(find.text('Resultado confirmado.'), findsOneWidget);
    expect(find.text('home'), findsOneWidget);
  });

  testWidgets('should show the error banner when confirming fails', (
    tester,
  ) async {
    when(
      () => repository.confirmMatchResult(
        matchId: any(named: 'matchId'),
        draftId: any(named: 'draftId'),
      ),
    ).thenThrow(Exception('boom'));

    await _pumpScreen(tester);
    await tester.tap(_confirmButton);
    await tester.pumpAndSettle();

    expect(find.text('No se pudo confirmar el resultado.'), findsOneWidget);
  });

  testWidgets('should not reject when the reject dialog is cancelled', (
    tester,
  ) async {
    await _pumpScreen(tester);

    await tester.tap(_rejectButton);
    await tester.pumpAndSettle();
    expect(
      find.text('¿Estás seguro de que deseas rechazar este resultado?'),
      findsOneWidget,
    );

    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();

    expect(find.byType(AlertDialog), findsNothing);
    verifyNever(
      () => repository.rejectMatchResult(
        matchId: any(named: 'matchId'),
        draftId: any(named: 'draftId'),
      ),
    );
  });

  testWidgets(
    'should reject the draft and reload when the dialog is confirmed',
    (tester) async {
      when(
        () => repository.rejectMatchResult(
          matchId: any(named: 'matchId'),
          draftId: any(named: 'draftId'),
        ),
      ).thenAnswer((_) async {
        //? Tras rechazar, el backend ya no devuelve borrador pendiente.
        when(
          () => repository.getMatchResultDraft(_matchId),
        ).thenAnswer((_) async => null);
      });

      await _pumpScreen(tester);
      await tester.tap(_rejectButton);
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Rechazar'));
      await tester.pumpAndSettle();

      verify(
        () =>
            repository.rejectMatchResult(matchId: _matchId, draftId: _draftId),
      ).called(1);
      expect(find.text('No hay resultado pendiente'), findsOneWidget);
    },
  );

  testWidgets('should show the error banner when rejecting fails', (
    tester,
  ) async {
    when(
      () => repository.rejectMatchResult(
        matchId: any(named: 'matchId'),
        draftId: any(named: 'draftId'),
      ),
    ).thenThrow(const AppFailure(code: 'X', message: 'Rechazo no permitido'));

    await _pumpScreen(tester);
    await tester.tap(_rejectButton);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Rechazar'));
    await tester.pumpAndSettle();

    expect(find.text('Rechazo no permitido'), findsOneWidget);
  });
}
