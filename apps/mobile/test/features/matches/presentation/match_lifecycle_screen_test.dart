import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/match_lifecycle_screen.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockMonetizationRepository extends Mock
    implements MonetizationRepository {}

class _MockExchangeRatesRepository extends Mock
    implements ExchangeRatesRepository {}

const _matchId = 'match-1';
const _viewerId = 'user-1';

MatchDetailDto _buildMatch({String status = 'SCHEDULED'}) {
  final at = DateTime(2030, 6, 1, 19);
  return MatchDetailDto(
    id: _matchId,
    sportId: 'sport',
    categoryId: 'cat',
    type: 'REGULAR',
    status: status,
    scheduledAt: at,
    pricePerPlayerCents: 0,
    maxParticipants: 4,
    participantCount: 1,
    openSpots: 3,
    courtId: null,
    clubName: 'Club Cuádrala',
    courtName: 'Cancha 1',
    locationLabel: 'Las Mercedes, Caracas',
    tournamentId: null,
    participants: [
      MatchParticipantDto(userId: _viewerId, joinedAt: DateTime(2030, 5, 30)),
    ],
    createdAt: at,
    updatedAt: at,
  );
}

//? Issue #116: match_lifecycle_screen.dart no tenía ningún test de widget.
//? Cubre los estados de carga, no encontrada, error con reintento y las
//? acciones Iniciar / Cancelar / Finalizar con sus diálogos de confirmación.
void main() {
  late _MockMatchesRepository matchesRepository;
  late _MockProfileRepository profileRepository;
  late _MockMonetizationRepository monetizationRepository;
  late _MockExchangeRatesRepository exchangeRatesRepository;

  setUp(() {
    matchesRepository = _MockMatchesRepository();
    profileRepository = _MockProfileRepository();
    monetizationRepository = _MockMonetizationRepository();
    exchangeRatesRepository = _MockExchangeRatesRepository();

    getIt.registerSingleton<MatchesRepository>(matchesRepository);
    getIt.registerSingleton<ProfileRepository>(profileRepository);
    getIt.registerSingleton<MonetizationRepository>(monetizationRepository);
    getIt.registerSingleton<ExchangeRatesRepository>(exchangeRatesRepository);

    when(() => profileRepository.getMe()).thenAnswer(
      (_) async => const UserMeDto(
        id: _viewerId,
        email: 'u@test.local',
        name: 'User',
        subscriptionType: 'FREE',
      ),
    );
    when(
      () => exchangeRatesRepository.listByCountry(
        countryCode: any(named: 'countryCode'),
      ),
    ).thenAnswer((_) async => const []);
  });

  tearDown(() {
    getIt.unregister<MatchesRepository>();
    getIt.unregister<ProfileRepository>();
    getIt.unregister<MonetizationRepository>();
    getIt.unregister<ExchangeRatesRepository>();
  });

  Future<void> pumpScreen(WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: MatchLifecycleScreen(matchId: _matchId)),
    );
    await tester.pumpAndSettle();
  }

  Finder primaryButton() => find.byWidgetPredicate((w) => w is FilledButton);

  Finder cancelButton() => find.byWidgetPredicate((w) => w is OutlinedButton);

  testWidgets('should show a spinner when the match is still loading', (
    tester,
  ) async {
    final pending = Completer<MatchDetailDto>();
    when(
      () => matchesRepository.getMatchById(_matchId),
    ).thenAnswer((_) => pending.future);

    await tester.pumpWidget(
      const MaterialApp(home: MatchLifecycleScreen(matchId: _matchId)),
    );
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    pending.complete(_buildMatch());
    await tester.pumpAndSettle();
    expect(find.byType(CircularProgressIndicator), findsNothing);
  });

  testWidgets('should show not found message when the API answers 404', (
    tester,
  ) async {
    when(
      () => matchesRepository.getMatchById(_matchId),
    ).thenThrow(const AppFailure(code: 'HTTP_404', message: 'Not found'));

    await pumpScreen(tester);

    expect(find.text('Partida no encontrada.'), findsOneWidget);
  });

  testWidgets('should show the error and reload when retry is tapped', (
    tester,
  ) async {
    var calls = 0;
    when(() => matchesRepository.getMatchById(_matchId)).thenAnswer((_) async {
      calls++;
      if (calls == 1) {
        throw const AppFailure(code: 'SERVER', message: 'Servidor caído.');
      }
      return _buildMatch();
    });

    await pumpScreen(tester);
    expect(find.text('Servidor caído.'), findsOneWidget);

    await tester.tap(find.text('Reintentar'));
    await tester.pumpAndSettle();

    verify(() => matchesRepository.getMatchById(_matchId)).called(2);
    expect(find.text('Servidor caído.'), findsNothing);
    expect(find.text('Club Cuádrala, Cancha 1'), findsOneWidget);
  });

  testWidgets('should render the match card when the match is scheduled', (
    tester,
  ) async {
    when(
      () => matchesRepository.getMatchById(_matchId),
    ).thenAnswer((_) async => _buildMatch());

    await pumpScreen(tester);

    expect(find.text('Partida — Ciclo de Vida'), findsOneWidget);
    expect(find.text('SCHEDULED'), findsOneWidget);
    expect(find.text('Club Cuádrala, Cancha 1'), findsOneWidget);
    expect(find.text('Jugadores (1/4)'), findsOneWidget);
    expect(find.textContaining('Usuario '), findsOneWidget);
    expect(find.text('Iniciar'), findsOneWidget);
    expect(tester.widget<FilledButton>(primaryButton()).onPressed, isNotNull);
    expect(tester.widget<OutlinedButton>(cancelButton()).onPressed, isNotNull);
  });

  testWidgets('should start the match when Iniciar is confirmed', (
    tester,
  ) async {
    when(
      () => matchesRepository.getMatchById(_matchId),
    ).thenAnswer((_) async => _buildMatch());
    when(() => matchesRepository.startMatch(_matchId)).thenAnswer((_) async {
      when(
        () => matchesRepository.getMatchById(_matchId),
      ).thenAnswer((_) async => _buildMatch(status: 'IN_PROGRESS'));
    });

    await pumpScreen(tester);
    await tester.tap(primaryButton());
    await tester.pumpAndSettle();

    expect(find.text('Iniciar partida'), findsOneWidget);
    expect(
      find.text('¿Confirmas que la partida empieza ahora?'),
      findsOneWidget,
    );

    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('Iniciar'),
      ),
    );
    await tester.pumpAndSettle();

    verify(() => matchesRepository.startMatch(_matchId)).called(1);
    expect(find.text('Partida iniciada.'), findsOneWidget);
    expect(find.text('IN_PROGRESS'), findsOneWidget);
    expect(find.text('Finalizar'), findsOneWidget);
  });

  testWidgets('should not cancel the match when the dialog is dismissed', (
    tester,
  ) async {
    when(
      () => matchesRepository.getMatchById(_matchId),
    ).thenAnswer((_) async => _buildMatch());

    await pumpScreen(tester);
    await tester.tap(cancelButton());
    await tester.pumpAndSettle();

    expect(find.text('Cancelar partida'), findsOneWidget);
    expect(find.text('Se notificará a los jugadores.'), findsOneWidget);

    await tester.tap(find.text('Volver'));
    await tester.pumpAndSettle();

    expect(find.byType(AlertDialog), findsNothing);
    verifyNever(() => matchesRepository.cancelMatch(any()));
  });

  testWidgets('should cancel the match when Cancelar is confirmed', (
    tester,
  ) async {
    when(
      () => matchesRepository.getMatchById(_matchId),
    ).thenAnswer((_) async => _buildMatch());
    when(() => matchesRepository.cancelMatch(_matchId)).thenAnswer((_) async {
      when(
        () => matchesRepository.getMatchById(_matchId),
      ).thenAnswer((_) async => _buildMatch(status: 'CANCELLED'));
    });

    await pumpScreen(tester);
    await tester.tap(cancelButton());
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('Cancelar'),
      ),
    );
    await tester.pumpAndSettle();

    verify(() => matchesRepository.cancelMatch(_matchId)).called(1);
    expect(find.text('Partida cancelada.'), findsOneWidget);
    expect(tester.widget<OutlinedButton>(cancelButton()).onPressed, isNull);
    expect(tester.widget<FilledButton>(primaryButton()).onPressed, isNull);
  });

  testWidgets('should finish the match when it is in progress', (tester) async {
    when(
      () => matchesRepository.getMatchById(_matchId),
    ).thenAnswer((_) async => _buildMatch(status: 'IN_PROGRESS'));
    when(
      () => matchesRepository.finishMatch(_matchId),
    ).thenAnswer((_) async {});

    await pumpScreen(tester);

    expect(tester.widget<OutlinedButton>(cancelButton()).onPressed, isNull);

    await tester.tap(primaryButton());
    await tester.pumpAndSettle();
    expect(find.text('Finalizar partida'), findsOneWidget);

    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('Finalizar'),
      ),
    );
    await tester.pumpAndSettle();

    verify(() => matchesRepository.finishMatch(_matchId)).called(1);
    verifyNever(() => matchesRepository.startMatch(any()));
    expect(find.text('Partida finalizada.'), findsOneWidget);
  });

  testWidgets('should show the API error when starting the match fails', (
    tester,
  ) async {
    when(
      () => matchesRepository.getMatchById(_matchId),
    ).thenAnswer((_) async => _buildMatch());
    when(() => matchesRepository.startMatch(_matchId)).thenThrow(
      const AppFailure(code: 'HTTP_409', message: 'La partida ya empezó.'),
    );

    await pumpScreen(tester);
    await tester.tap(primaryButton());
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('Iniciar'),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('La partida ya empezó.'), findsOneWidget);
    expect(find.text('SCHEDULED'), findsOneWidget);
  });

  testWidgets('should disable every action when the match is finished', (
    tester,
  ) async {
    when(
      () => matchesRepository.getMatchById(_matchId),
    ).thenAnswer((_) async => _buildMatch(status: 'FINISHED'));

    await pumpScreen(tester);

    expect(tester.widget<OutlinedButton>(cancelButton()).onPressed, isNull);
    expect(tester.widget<FilledButton>(primaryButton()).onPressed, isNull);
  });
}
