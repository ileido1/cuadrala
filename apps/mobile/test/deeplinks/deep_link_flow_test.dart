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
import 'package:cuadrala_mobile/src/features/matches/data/matches_api.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:cuadrala_mobile/src/router/app_router.dart';

class _MockSessionCubit extends MockCubit<SessionState> implements SessionCubit {}
class _MockAuthRepository extends Mock implements AuthRepository {}
class _MockProfileRepository extends Mock implements ProfileRepository {}

final class _FakeCatalogApi implements CatalogApi {
  @override
  Future<Map<String, Object?>> listSportsEnvelope() async => {
        'sports': <Map<String, Object?>>[
          {
            'id': 'sport_padel',
            'code': 'PADEL',
            'name': 'Pádel',
          },
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
  }) async {
    return {
      'items': <Object?>[],
      'pageInfo': <String, Object?>{
        'page': page,
        'limit': limit,
        'total': 0,
      },
    };
  }

  @override
  Future<Map<String, Object?>> getMatchEnvelope({required String matchId}) async {
    final now = DateTime.utc(2026, 5, 4, 12).toIso8601String();
    return {
      'match': <String, Object?>{
        'id': matchId,
        'sportId': 'sport_padel',
        'categoryId': 'cat',
        'type': 'OPEN',
        'status': 'OPEN',
        'scheduledAt': now,
        'pricePerPlayerCents': 450000,
        'maxParticipants': 4,
        'participantCount': 0,
        'openSpots': 4,
        'courtId': null,
        'tournamentId': null,
        'participants': <Object?>[],
        'createdAt': now,
        'updatedAt': now,
      },
    };
  }

  @override
  Future<Map<String, Object?>> cancelMatchEnvelope({required String matchId}) async {
    return {'data': <String, Object?>{'id': matchId}};
  }

  @override
  Future<Map<String, Object?>> confirmResultDraftEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  }) async {
    return {'data': <String, Object?>{'confirmedCount': 1, 'required': 4}};
  }

  @override
  Future<Map<String, Object?>> createMatchEnvelope({required Map<String, Object?> body}) async {
    return {'data': <String, Object?>{'id': 'new'}};
  }

  @override
  Future<void> finishMatch({required String matchId}) async {}

  @override
  Future<Map<String, Object?>> joinMatchEnvelope({required String matchId}) async {
    return {'data': <String, Object?>{'ok': true}};
  }

  @override
  Future<void> leaveMatch({required String matchId}) async {}

  @override
  Future<Map<String, Object?>> reproposeResultDraftEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  }) async {
    return {'data': <String, Object?>{'id': 'draft'}};
  }

  @override
  Future<void> startMatch({required String matchId}) async {}

  @override
  Future<Map<String, Object?>> upsertResultDraftEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  }) async {
    return {'data': <String, Object?>{'id': 'draft'}};
  }
}

void main() {
  group('Deep links (go_router)', () {
    setUp(() async {
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
      getIt.registerSingleton<MatchesRepository>(
        MatchesRepository(
          matchesApi: _FakeMatchesApi(),
          catalogRepository: CatalogRepository(catalogApi: _FakeCatalogApi()),
        ),
      );
      getIt.registerFactory<LoginCubit>(
        () => LoginCubit(authRepository: getIt<AuthRepository>()),
      );
    });

    testWidgets('si está autenticado, abre deep link protegido', (tester) async {
      final sessionCubit = _MockSessionCubit();
      when(() => sessionCubit.state).thenReturn(const SessionState.authenticated());
      whenListen(sessionCubit, const Stream<SessionState>.empty());

      final router = AppRouter(sessionCubit: sessionCubit).router;
      router.go('/matches/123');

      await tester.pumpWidget(
        MaterialApp.router(
          routerConfig: router,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('match.detail')), findsOneWidget);
    });

    testWidgets('si NO está autenticado, deep link protegido redirige a login',
        (tester) async {
      final sessionCubit = _MockSessionCubit();
      when(() => sessionCubit.state).thenReturn(const SessionState.unauthenticated());
      whenListen(sessionCubit, const Stream<SessionState>.empty());

      final router = AppRouter(sessionCubit: sessionCubit).router;
      router.go('/matches/123');

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('login.screen')), findsOneWidget);
    });
  });
}
