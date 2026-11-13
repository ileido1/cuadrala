import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
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

//? La API manda instantes UTC. Se arma la hora local 12:00 y se pasa a UTC
//? (como llega del JSON) para que la hora esperada sea la misma en cualquier
//? zona horaria donde corran los tests.
final _localStart = DateTime(2026, 5, 5, 12).toUtc();

MatchDetailDto _buildMatch({
  String status = 'SCHEDULED',
  int pricePerPlayerCents = 0,
  String? organizerUserId,
  List<String> participantIds = const [_viewerId],
  DateTime? scheduledAt,
}) {
  final now = DateTime.utc(2026, 5, 5, 12);
  return MatchDetailDto(
    id: _matchId,
    sportId: 'sport',
    categoryId: 'cat',
    type: 'REGULAR',
    status: status,
    scheduledAt: scheduledAt ?? _localStart,
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
      for (final id in participantIds)
        MatchParticipantDto(userId: id, joinedAt: DateTime.utc(2026, 5, 1)),
    ],
    createdAt: now,
    updatedAt: now,
    organizerUserId: organizerUserId,
  );
}

Widget _buildTestApp() {
  final router = GoRouter(
    initialLocation: '/matches/$_matchId',
    routes: [
      GoRoute(
        path: '/matches/:matchId',
        builder: (context, state) =>
            MatchDetailScreen(matchId: state.pathParameters['matchId']!),
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
      (_) async =>
          const UserTransactionsResult(userId: _viewerId, transactions: []),
    );
  });

  tearDown(() {
    getIt.unregister<MatchesRepository>();
    getIt.unregister<ProfileRepository>();
    getIt.unregister<MonetizationRepository>();
  });

  //? S1/S8: la partida empieza sola a la hora del bloque; el organizador ya
  //? no la inicia. Antes el footer mostraba "Iniciar partido" (7952ff4).
  group('scheduled footer', () {
    //? Antes se formateaba el instante UTC tal cual: en Venezuela (UTC-4) una
    //? partida de las 22:30 aparecía a las 02:30 del día siguiente.
    testWidgets(
      'should show the start date and time in local time when scheduled',
      (tester) async {
        when(() => matchesRepository.getMatchById(_matchId)).thenAnswer(
          (_) async =>
              _buildMatch(scheduledAt: DateTime(2026, 5, 5, 22, 30).toUtc()),
        );

        await tester.pumpWidget(_buildTestApp());
        await tester.pumpAndSettle();

        expect(find.text('Empieza a las 22:30'), findsOneWidget);
        expect(find.text('22:30 hs'), findsOneWidget);
        expect(find.textContaining('05 May'), findsOneWidget);
      },
    );

    testWidgets(
      'should show the start time and no start or result buttons when scheduled',
      (tester) async {
        when(
          () => matchesRepository.getMatchById(_matchId),
        ).thenAnswer((_) async => _buildMatch());

        await tester.pumpWidget(_buildTestApp());
        await tester.pumpAndSettle();

        expect(find.text('Empieza a las 12:00'), findsOneWidget);
        expect(find.text('Cargar resultado'), findsNothing);
        expect(find.text('Iniciar partido'), findsNothing);
      },
    );
  });

  //? S2/S8: cargar el resultado termina la partida, así que se ofrece
  //? mientras está en curso; la pantalla en vivo se eliminó (S7).
  group('in-progress footer', () {
    testWidgets(
      'should show the block end and let a participant load the result when in progress',
      (tester) async {
        when(
          () => matchesRepository.getMatchById(_matchId),
        ).thenAnswer((_) async => _buildMatch(status: 'IN_PROGRESS'));

        await tester.pumpWidget(_buildTestApp());
        await tester.pumpAndSettle();

        expect(find.text('En curso · termina 13:30'), findsOneWidget);
        expect(find.text('Ver partido en vivo'), findsNothing);
        await tester.tap(find.text('Cargar resultado'));
        await tester.pumpAndSettle();

        expect(find.text('Result entry: $_matchId'), findsOneWidget);
      },
    );

    testWidgets(
      'should not offer to load the result to a non participant when in progress',
      (tester) async {
        when(() => matchesRepository.getMatchById(_matchId)).thenAnswer(
          (_) async => _buildMatch(
            status: 'IN_PROGRESS',
            participantIds: const ['other-user'],
          ),
        );

        await tester.pumpWidget(_buildTestApp());
        await tester.pumpAndSettle();

        expect(find.text('En curso · termina 13:30'), findsOneWidget);
        expect(find.text('Cargar resultado'), findsNothing);
      },
    );
  });

  group('finished footer', () {
    testWidgets(
      'should still offer to load the result once the match finished',
      (tester) async {
        when(
          () => matchesRepository.getMatchById(_matchId),
        ).thenAnswer((_) async => _buildMatch(status: 'FINISHED'));
        when(
          () => profileRepository.getUserRatingHistory(
            userId: any(named: 'userId'),
            categoryId: any(named: 'categoryId'),
            limit: any(named: 'limit'),
          ),
        ).thenAnswer((_) async => const []);

        await tester.pumpWidget(_buildTestApp());
        await tester.pumpAndSettle();
        await tester.tap(find.text('Cargar resultado'));
        await tester.pumpAndSettle();

        expect(find.text('Result entry: $_matchId'), findsOneWidget);
      },
    );
  });

  //? S6/S8: el sheet ya no ofrece iniciar ni finalizar a mano, y el
  //? organizador sale de `organizerUserId` (con fallback al primer jugador).
  group('actions sheet', () {
    Future<void> openSheet(WidgetTester tester) async {
      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Acciones'));
      await tester.pumpAndSettle();
    }

    for (final status in ['SCHEDULED', 'IN_PROGRESS']) {
      testWidgets(
        'should not offer manual start or finish to the organizer when $status',
        (tester) async {
          when(() => matchesRepository.getMatchById(_matchId)).thenAnswer(
            (_) async =>
                _buildMatch(status: status, organizerUserId: _viewerId),
          );

          await openSheet(tester);

          expect(find.text('Iniciar partida'), findsNothing);
          expect(find.text('Finalizar partida'), findsNothing);
        },
      );
    }

    testWidgets(
      'should treat organizerUserId as organizer even when not first participant',
      (tester) async {
        when(() => matchesRepository.getMatchById(_matchId)).thenAnswer(
          (_) async => _buildMatch(
            organizerUserId: _viewerId,
            participantIds: const ['other-user', _viewerId],
          ),
        );

        await openSheet(tester);

        expect(find.text('Cancelar partida'), findsOneWidget);
        expect(find.text('Salir de la partida'), findsNothing);
      },
    );

    testWidgets(
      'should not treat the first participant as organizer when organizerUserId differs',
      (tester) async {
        when(() => matchesRepository.getMatchById(_matchId)).thenAnswer(
          (_) async => _buildMatch(
            organizerUserId: 'other-user',
            participantIds: const [_viewerId, 'other-user'],
          ),
        );

        await openSheet(tester);

        expect(find.text('Cancelar partida'), findsNothing);
        expect(find.text('Salir de la partida'), findsOneWidget);
      },
    );

    testWidgets(
      'should fall back to the first participant when organizerUserId is absent',
      (tester) async {
        when(
          () => matchesRepository.getMatchById(_matchId),
        ).thenAnswer((_) async => _buildMatch());

        await openSheet(tester);

        expect(find.text('Cancelar partida'), findsOneWidget);
      },
    );
  });

  group('banner de ELO en partida finalizada (issue #129)', () {
    testWidgets(
      'muestra el número real de ELO cuando el historial ya tiene una fila '
      'para este match',
      (tester) async {
        when(
          () => matchesRepository.getMatchById(_matchId),
        ).thenAnswer((_) async => _buildMatch(status: 'FINISHED'));
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
        when(
          () => matchesRepository.getMatchById(_matchId),
        ).thenAnswer((_) async => _buildMatch(status: 'FINISHED'));
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
