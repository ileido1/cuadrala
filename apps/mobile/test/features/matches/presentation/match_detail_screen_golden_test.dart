import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/models/transaction_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/match_detail_screen.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

import '../goldens/matches_golden.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockMonetizationRepository extends Mock
    implements MonetizationRepository {}

class _MockExchangeRatesRepository extends Mock
    implements ExchangeRatesRepository {}

const _matchId = 'match-1';
const _viewerId = 'user-1';

MatchDetailDto _buildMatch({
  List<MatchParticipantDto> participants = const [],
  int openSpots = 4,
  String status = 'SCHEDULED',
}) {
  final now = DateTime(2030, 6, 1, 12);
  return MatchDetailDto(
    id: _matchId,
    sportId: 'sport',
    categoryId: 'cat',
    type: 'REGULAR',
    status: status,
    scheduledAt: now,
    pricePerPlayerCents: 1000,
    maxParticipants: 4,
    participantCount: participants.length,
    openSpots: openSpots,
    courtId: null,
    clubName: 'Club Cuádrala',
    courtName: 'Cancha 1',
    locationLabel: 'Las Mercedes, Caracas',
    tournamentId: null,
    participants: participants,
    createdAt: now,
    updatedAt: now,
  );
}

// NO envuelve en el MaterialApp del helper de goldens: `MaterialApp.router`
// ya trae su propio Theme/Navigator/Localizations, y anidarlo dentro de OTRO
// MaterialApp (como hace `pumpMatchesGolden`) dejaba el Theme real (con la
// fuente de la app) en el de afuera mientras este router quedaba con el
// tema default de Flutter — el texto se veía como bloques sólidos sin
// glifos reales.
Widget _buildTestApp({required Brightness brightness}) {
  final router = GoRouter(
    initialLocation: '/matches/$_matchId',
    routes: [
      GoRoute(
        path: '/matches/:matchId',
        builder: (context, state) => MatchDetailScreen(
          matchId: state.pathParameters['matchId']!,
        ),
      ),
    ],
  );
  return MaterialApp.router(
    locale: const Locale('es'),
    theme: brightness == Brightness.dark ? AppTheme.dark() : AppTheme.light(),
    routerConfig: router,
    builder: (context, child) => RepaintBoundary(
      key: matchesGoldenKey,
      child: child ?? const SizedBox.shrink(),
    ),
  );
}

//? Issue #116: match_detail_screen.dart ya tenía tests de comportamiento
//? pero ningún golden. Cubre dos fases reales: "browse" (jugador que todavía
//? no se unió) y "confirmed" (ya pagó, cupo asegurado).
void main() {
  late _MockMatchesRepository matchesRepository;
  late _MockProfileRepository profileRepository;
  late _MockMonetizationRepository monetizationRepository;
  late _MockExchangeRatesRepository exchangeRatesRepository;

  setUpAll(loadMatchesGoldenFonts);

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

  Future<void> pumpScreen(WidgetTester tester, {required Brightness brightness}) async {
    tester.view.physicalSize = const Size(402, 874);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(_buildTestApp(brightness: brightness));
    await tester.pumpAndSettle();
  }

  for (final brightness in Brightness.values) {
    testWidgets('browse (sin unirse) ${brightness.name}', (tester) async {
      when(() => matchesRepository.getMatchById(_matchId))
          .thenAnswer((_) async => _buildMatch(openSpots: 2, participants: [
                MatchParticipantDto(
                  userId: 'other-1',
                  joinedAt: DateTime(2030, 5, 30),
                ),
              ]));
      when(
        () => monetizationRepository.listMyTransactions(limit: any(named: 'limit')),
      ).thenAnswer(
        (_) async => const UserTransactionsResult(userId: _viewerId, transactions: []),
      );

      await pumpScreen(tester, brightness: brightness);

      await expectLater(
        find.byKey(matchesGoldenKey),
        matchesGoldenFile('goldens/match_detail_browse_${brightness.name}.png'),
      );
    });

    testWidgets('confirmed (ya pagó) ${brightness.name}', (tester) async {
      when(() => matchesRepository.getMatchById(_matchId)).thenAnswer(
        (_) async => _buildMatch(
          openSpots: 3,
          participants: [
            MatchParticipantDto(userId: _viewerId, joinedAt: DateTime(2030, 5, 30)),
          ],
        ),
      );
      when(
        () => monetizationRepository.listMyTransactions(limit: any(named: 'limit')),
      ).thenAnswer(
        (_) async => UserTransactionsResult(
          userId: _viewerId,
          transactions: [
            TransactionDto(
              id: 'tx-1',
              matchId: _matchId,
              userId: _viewerId,
              amountBase: '10',
              feeAmount: '1',
              amountTotal: '11',
              status: 'CONFIRMED',
              paymentMethod: 'MANUAL',
              confirmedAt: DateTime(2030, 5, 30),
              createdAt: DateTime(2030, 5, 29),
            ),
          ],
        ),
      );

      await pumpScreen(tester, brightness: brightness);

      await expectLater(
        find.byKey(matchesGoldenKey),
        matchesGoldenFile('goldens/match_detail_confirmed_${brightness.name}.png'),
      );
    });
  }
}
