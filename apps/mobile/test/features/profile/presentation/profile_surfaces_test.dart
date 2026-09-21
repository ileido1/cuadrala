import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_state.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/onboarding_status_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/player_profile_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_stats_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/cubit/profile_cubit.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/cubit/profile_state.dart';
import 'package:cuadrala_mobile/src/router/app_router.dart';
import 'package:cuadrala_mobile/src/router/routes.dart';

class _MockSessionCubit extends MockCubit<SessionState>
    implements SessionCubit {}

class _MockProfileCubit extends MockCubit<ProfileState>
    implements ProfileCubit {}

const _me = UserMeDto(
  id: 'me-id',
  email: 'me@test.com',
  name: 'Test User',
  subscriptionType: 'FREE',
);

final _loaded = ProfileLoaded(
  me: _me,
  stats: const UserStatsDto(
    userId: 'me-id',
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    winRate: 0,
  ),
  ratings: const [],
  history: const [],
  playerProfile: const PlayerProfileDto(dominantHand: 'RIGHT'),
  onboardingStatus: const OnboardingStatusDto(
    completedSteps: [],
    pendingSteps: [],
    isComplete: true,
    completedAt: null,
  ),
  sportProfiles: const [],
  location: null,
  availability: const [],
  sports: const [],
);

void main() {
  late _MockProfileCubit profileCubit;
  late _MockSessionCubit sessionCubit;

  setUp(() async {
    await GetIt.I.reset();
    profileCubit = _MockProfileCubit();
    sessionCubit = _MockSessionCubit();
    when(() => profileCubit.state).thenReturn(_loaded);
    when(() => profileCubit.load()).thenAnswer((_) async {});
    whenListen(profileCubit, Stream.value(_loaded), initialState: _loaded);
    when(
      () => sessionCubit.state,
    ).thenReturn(const SessionState.authenticated());
    whenListen(sessionCubit, const Stream<SessionState>.empty());
    getIt.registerFactory<ProfileCubit>(() => profileCubit);
  });

  tearDown(() async {
    await GetIt.I.reset();
  });

  testWidgets('settings route renders account, privacy, and logout sections', (
    tester,
  ) async {
    final router = AppRouter(sessionCubit: sessionCubit).router;
    router.go(Routes.settings);

    await tester.pumpWidget(
      MaterialApp.router(theme: AppTheme.dark(), routerConfig: router),
    );
    expect(find.text('Ajustes'), findsOneWidget);
    expect(find.text('Cuenta'), findsOneWidget);
    expect(find.text('Privacidad'), findsOneWidget);
    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, -1200),
      1000,
    );
    await tester.pumpAndSettle();

    expect(find.text('Cerrar sesión'), findsOneWidget);
  });

  testWidgets('public route renders self-preview without fabricated username', (
    tester,
  ) async {
    final router = AppRouter(sessionCubit: sessionCubit).router;
    router.go(Routes.publicProfile);

    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pumpAndSettle();

    expect(find.text('Vista pública'), findsOneWidget);
    expect(find.text('Test User'), findsOneWidget);
    expect(find.textContaining('@testuser'), findsNothing);
    expect(
      find.text('Los resultados ganados y perdidos aún no están disponibles.'),
      findsOneWidget,
    );
  });
}
