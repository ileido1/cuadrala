import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/theme/app_icons.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/match_detail_screen.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_rating_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockMonetizationRepository extends Mock
    implements MonetizationRepository {}

const _matchId = 'match-1';
const _viewerId = 'user-1';

MatchDetailDto _buildMatch({
  String status = 'SCHEDULED',
  int pricePerPlayerCents = 0,
}) {
  final now = DateTime.utc(2026, 5, 5, 12);
  return MatchDetailDto(
    id: _matchId,
    sportId: 'sport',
    categoryId: 'cat',
    type: 'REGULAR',
    status: status,
    scheduledAt: now,
    pricePerPlayerCents: pricePerPlayerCents,
    maxParticipants: 2,
    participantCount: 1,
    openSpots: 0,
    courtId: null,
    clubName: 'Club',
    courtName: 'Cancha 1',
    locationLabel: 'Dirección',
    tournamentId: null,
    participants: [
      MatchParticipantDto(userId: _viewerId, joinedAt: DateTime.utc(2026, 5, 1)),
    ],
    createdAt: now,
    updatedAt: now,
  );
}

Widget _buildTestApp() {
  final router = GoRouter(
    initialLocation: '/matches/$_matchId',
    routes: [
      GoRoute(
        path: '/matches/:matchId',
        builder: (context, state) => MatchDetailScreen(
          matchId: state.pathParameters['matchId']!,
        ),
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

void main() {
  late _MockMatchesRepository matchesRepository;
  late _MockProfileRepository profileRepository;
  late _MockMonetizationRepository monetizationRepository;

  setUp(() {
    matchesRepository = _MockMatchesRepository();
    profileRepository = _MockProfileRepository();
    monetizationRepository = _MockMonetizationRepository();

    getIt.registerSingleton<MatchesRepository>(matchesRepository);
    getIt.registerSingleton<ProfileRepository>(profileRepository);
    getIt.registerSingleton<MonetizationRepository>(monetizationRepository);

    when(() => profileRepository.getMe()).thenAnswer(
      (_) async => const UserMeDto(
        id: _viewerId,
        email: 'u@test.local',
        name: 'User',
        subscriptionType: 'FREE',
      ),
    );

    // `_PlayerTile` (fallback de jugadores) consulta esto directamente vía
    // getIt, independientemente del precio de la partida.
    when(
      () => monetizationRepository.listUserTransactions(
        userId: any(named: 'userId'),
        limit: any(named: 'limit'),
      ),
    ).thenAnswer(
      (_) async => const UserTransactionsResult(
        userId: _viewerId,
        transactions: [],
      ),
    );
  });

  tearDown(() {
    getIt.unregister<MatchesRepository>();
    getIt.unregister<ProfileRepository>();
    getIt.unregister<MonetizationRepository>();
  });

  group('pending/confirmed footer', () {
    testWidgets(
      'shows "Cargar resultado" as the primary CTA instead of "Compartir partida"',
      (tester) async {
        when(() => matchesRepository.getMatchById(_matchId)).thenAnswer(
          (_) async => _buildMatch(),
        );

        await tester.pumpWidget(_buildTestApp());
        await tester.pumpAndSettle();

        expect(find.text('Cargar resultado'), findsOneWidget);
        expect(find.text('Compartir partida'), findsNothing);
        // El botón cuadrado de compartir se mantiene (appbar + footer).
        expect(find.byIcon(AppIcons.share), findsNWidgets(2));
      },
    );

    testWidgets(
      'tapping "Cargar resultado" opens the same result-entry route as the played phase',
      (tester) async {
        when(() => matchesRepository.getMatchById(_matchId)).thenAnswer(
          (_) async => _buildMatch(),
        );

        await tester.pumpWidget(_buildTestApp());
        await tester.pumpAndSettle();

        await tester.tap(find.text('Cargar resultado'));
        await tester.pumpAndSettle();

        expect(find.text('Result entry: $_matchId'), findsOneWidget);
      },
    );
  });

  group('banner de ELO en partida finalizada (issue #129)', () {
    testWidgets(
      'muestra el número real de ELO cuando el historial ya tiene una fila '
      'para este match',
      (tester) async {
        when(() => matchesRepository.getMatchById(_matchId)).thenAnswer(
          (_) async => _buildMatch(status: 'FINISHED'),
        );
        when(
          () => profileRepository.getUserRatingHistory(
            userId: _viewerId,
            categoryId: 'cat',
            limit: any(named: 'limit'),
          ),
        ).thenAnswer(
          (_) async => [
            UserRatingHistoryItemDto(
              matchId: _matchId,
              resultId: 'r-1',
              previousRating: 1240,
              newRating: 1254,
              kFactor: 20,
              createdAt: DateTime.utc(2026, 5, 6),
            ),
          ],
        );

        await tester.pumpWidget(_buildTestApp());
        await tester.pumpAndSettle();

        expect(find.text('Tu ELO: 1240 → 1254 (+14)'), findsOneWidget);
        expect(find.text('Resultado y ELO actualizados'), findsNothing);
      },
    );

    testWidgets(
      'mantiene el texto genérico mientras el resultado sigue sin las 4 '
      'confirmaciones (sin fila en el historial para este match)',
      (tester) async {
        when(() => matchesRepository.getMatchById(_matchId)).thenAnswer(
          (_) async => _buildMatch(status: 'FINISHED'),
        );
        when(
          () => profileRepository.getUserRatingHistory(
            userId: _viewerId,
            categoryId: 'cat',
            limit: any(named: 'limit'),
          ),
        ).thenAnswer((_) async => const []);

        await tester.pumpWidget(_buildTestApp());
        await tester.pumpAndSettle();

        expect(find.text('Resultado y ELO actualizados'), findsOneWidget);
      },
    );
  });
}
