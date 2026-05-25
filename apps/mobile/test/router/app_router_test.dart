import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/auth/data/auth_repository.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/login_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_state.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_api.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/home/presentation/cubit/home_cubit.dart';
import 'package:cuadrala_mobile/src/features/home/presentation/cubit/home_state.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_api.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/open_matches_cubit.dart';
import 'package:cuadrala_mobile/src/features/notifications/presentation/cubit/notifications_cubit.dart';
import 'package:cuadrala_mobile/src/features/notifications/presentation/cubit/notifications_state.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:cuadrala_mobile/src/router/app_router.dart';

// ---------------------------------------------------------------------------
// Mocks / fakes
// ---------------------------------------------------------------------------

class _MockSessionCubit extends MockCubit<SessionState> implements SessionCubit {}

class _MockAuthRepository extends Mock implements AuthRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockHomeCubit extends MockCubit<HomeState> implements HomeCubit {}

class _MockNotificationsCubit extends MockCubit<NotificationsState>
    implements NotificationsCubit {}

final class _FakeCatalogApi implements CatalogApi {
  @override
  Future<Map<String, Object?>> listSportsEnvelope() async => {
        'sports': <Map<String, Object?>>[
          {'id': 'sport_padel', 'code': 'PADEL', 'name': 'Pádel'},
        ],
      };

  @override
  Future<Map<String, Object?>> listCategoriesEnvelope({String? sportId}) async => {
        'categories': <Map<String, Object?>>[
          {'id': 'cat_1', 'name': 'Primera', 'slug': 'primera'},
        ],
      };
}

final class _FakeMatchesApi implements MatchesApi {
  @override
  Future<Map<String, Object?>> listOpenMatchesEnvelope({
    required String sportId,
    int page = 1,
    int limit = 20,
    String? categoryId,
  }) async =>
      {
        'items': <Object?>[],
        'pageInfo': <String, Object?>{'page': page, 'limit': limit, 'total': 0},
      };

  @override
  Future<Map<String, Object?>> getMatchEnvelope({required String matchId}) async {
    final now = DateTime.utc(2026, 5, 4, 12).toIso8601String();
    return {
      'match': <String, Object?>{
        'id': matchId,
        'sportId': 'sport_padel',
        'categoryId': 'cat',
        'type': 'OPEN',
        'status': 'SCHEDULED',
        'scheduledAt': now,
        'pricePerPlayerCents': 450000,
        'maxParticipants': 4,
        'participantCount': 0,
        'openSpots': 4,
        'courtId': null,
        'clubName': 'Club',
        'courtName': 'Cancha 1',
        'locationLabel': 'Dirección',
        'tournamentId': null,
        'participants': <Object?>[],
        'createdAt': now,
        'updatedAt': now,
      },
    };
  }

  @override
  Future<Map<String, Object?>> cancelMatchEnvelope({required String matchId}) async =>
      {'data': <String, Object?>{'id': matchId}};

  @override
  Future<Map<String, Object?>> confirmResultDraftEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  }) async =>
      {'data': <String, Object?>{'confirmedCount': 1, 'required': 4}};

  @override
  Future<Map<String, Object?>> createMatchEnvelope(
          {required Map<String, Object?> body}) async =>
      {'data': <String, Object?>{'id': 'new'}};

  @override
  Future<void> finishMatch({required String matchId}) async {}

  @override
  Future<Map<String, Object?>> joinMatchEnvelope({required String matchId}) async =>
      {'data': <String, Object?>{'ok': true}};

  @override
  Future<void> leaveMatch({required String matchId}) async {}

  @override
  Future<Map<String, Object?>> reproposeResultDraftEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  }) async =>
      {'data': <String, Object?>{'id': 'draft'}};

  @override
  Future<void> startMatch({required String matchId}) async {}

  @override
  Future<Map<String, Object?>> listMyMatchesEnvelope({
    int page = 1,
    int limit = 20,
  }) async =>
      {
        'items': <Object?>[],
        'pageInfo': <String, Object?>{'page': page, 'limit': limit, 'total': 0},
      };

  @override
  Future<Map<String, Object?>> upsertResultDraftEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  }) async =>
      {'data': <String, Object?>{'id': 'draft'}};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Registers all GetIt dependencies needed for the router tests.
/// Shell cubits are injected directly to avoid network calls.
Future<void> _setupGetIt({
  required _MockHomeCubit homeCubit,
  required _MockNotificationsCubit notifCubit,
}) async {
  await getIt.reset();
  getIt.registerSingleton<AuthRepository>(_MockAuthRepository());

  final profileRepo = _MockProfileRepository();
  when(() => profileRepo.getMe()).thenAnswer(
    (_) async => const UserMeDto(
      id: 'user-1',
      email: 'u@test.local',
      name: 'User',
      subscriptionType: 'FREE',
    ),
  );
  getIt.registerSingleton<ProfileRepository>(profileRepo);

  final matchesRepo = MatchesRepository(
    matchesApi: _FakeMatchesApi(),
    catalogRepository: CatalogRepository(catalogApi: _FakeCatalogApi()),
  );
  getIt.registerSingleton<MatchesRepository>(matchesRepo);

  getIt.registerFactory<LoginCubit>(
    () => LoginCubit(authRepository: getIt<AuthRepository>()),
  );

  // Shell cubits — registered as factories so ShellScreen can call getIt<...>()
  // HomeCubit is mocked; OpenMatchesCubit uses a real instance (idle, no auto-load);
  // NotificationsCubit is mocked.
  getIt.registerFactory<HomeCubit>(() => homeCubit);
  getIt.registerFactory<OpenMatchesCubit>(
    () => OpenMatchesCubit(matchesRepository: matchesRepo),
  );
  getIt.registerFactory<NotificationsCubit>(() => notifCubit);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  late _MockHomeCubit homeCubit;
  late _MockNotificationsCubit notifCubit;

  setUp(() async {
    homeCubit = _MockHomeCubit();
    notifCubit = _MockNotificationsCubit();

    // Stub initial states so BlocBuilder does not blow up
    when(() => homeCubit.state).thenReturn(const HomeInitial());
    when(() => notifCubit.state).thenReturn(NotificationsState.initial());

    // load() is called on mount — stub as no-op
    when(() => homeCubit.load()).thenAnswer((_) async {});
    when(() => notifCubit.load()).thenAnswer((_) async {});

    await _setupGetIt(
      homeCubit: homeCubit,
      notifCubit: notifCubit,
    );
  });

  tearDown(() async {
    await getIt.reset();
  });

  group('AppRouter — StatefulShellRoute migration (PR5)', () {
    // ── 1. Shell renders when navigating to /home ───────────────────────────

    testWidgets(
        'authenticated user navigating to /home sees the shell bottom nav',
        (tester) async {
      final sessionCubit = _MockSessionCubit();
      when(() => sessionCubit.state)
          .thenReturn(const SessionState.authenticated());
      whenListen(sessionCubit, const Stream<SessionState>.empty());

      final router = AppRouter(sessionCubit: sessionCubit).router;

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();

      expect(find.byType(BottomNavigationBar), findsOneWidget);
    });

    // ── 2. /matches/:matchId renders WITHOUT bottom nav ─────────────────────

    testWidgets(
        'deep link to /matches/:matchId renders MatchDetailScreen — no bottom nav',
        (tester) async {
      final sessionCubit = _MockSessionCubit();
      when(() => sessionCubit.state)
          .thenReturn(const SessionState.authenticated());
      whenListen(sessionCubit, const Stream<SessionState>.empty());

      final router = AppRouter(sessionCubit: sessionCubit).router;
      router.go('/matches/test-uuid-123');

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();

      // Match detail rendered (key set on MatchDetailScreen scaffold)
      expect(find.byKey(const Key('match.detail')), findsOneWidget);

      // No bottom navigation bar visible — route is outside the shell
      expect(find.byType(BottomNavigationBar), findsNothing);
    });

    // ── 3. /partidas is a shell branch (shows bottom nav) ───────────────────

    testWidgets(
        'navigating to /partidas via router renders within the shell (bottom nav visible)',
        (tester) async {
      final sessionCubit = _MockSessionCubit();
      when(() => sessionCubit.state)
          .thenReturn(const SessionState.authenticated());
      whenListen(sessionCubit, const Stream<SessionState>.empty());

      final router = AppRouter(sessionCubit: sessionCubit).router;
      router.go('/partidas');

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();

      // Shell bottom nav still present — /partidas is a shell branch
      expect(find.byType(BottomNavigationBar), findsOneWidget);
    });

    // ── 4. /avisos is a shell branch (shows bottom nav) ─────────────────────

    testWidgets(
        'navigating to /avisos via router renders within the shell (bottom nav visible)',
        (tester) async {
      final sessionCubit = _MockSessionCubit();
      when(() => sessionCubit.state)
          .thenReturn(const SessionState.authenticated());
      whenListen(sessionCubit, const Stream<SessionState>.empty());

      final router = AppRouter(sessionCubit: sessionCubit).router;
      router.go('/avisos');

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();

      expect(find.byType(BottomNavigationBar), findsOneWidget);
    });

    // ── 5. Unauthenticated user gets redirected ──────────────────────────────

    testWidgets(
        'unauthenticated user navigating to /matches/:matchId redirects to /welcome',
        (tester) async {
      final sessionCubit = _MockSessionCubit();
      when(() => sessionCubit.state)
          .thenReturn(const SessionState.unauthenticated());
      whenListen(sessionCubit, const Stream<SessionState>.empty());

      final router = AppRouter(sessionCubit: sessionCubit).router;
      router.go('/matches/test-uuid-123');

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('welcome.screen')), findsOneWidget);
    });
  });
}
