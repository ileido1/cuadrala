// Issue #136: "Editar perfil" debe ser una acción directa de un toque desde
// la pantalla principal de Perfil, no un segundo toque dentro de Ajustes.
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_state.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/onboarding_status_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/player_profile_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_stats_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/cubit/profile_cubit.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/cubit/profile_state.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/profile_screen.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/profile_settings_screen.dart';
import 'package:cuadrala_mobile/src/router/routes.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockSessionCubit extends MockCubit<SessionState>
    implements SessionCubit {}

class _MockProfileCubit extends MockCubit<ProfileState>
    implements ProfileCubit {}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const _kMe = UserMeDto(
  id: 'me-id',
  email: 'me@test.com',
  name: 'Test User',
  subscriptionType: 'FREE',
);

const _kStats = UserStatsDto(
  userId: 'me-id',
  matchesPlayed: 0,
  matchesWon: 0,
  matchesLost: 0,
  winRate: 0,
);

const _kPlayerProfile = PlayerProfileDto(dominantHand: 'RIGHT');

const _kOnboardingStatus = OnboardingStatusDto(
  completedSteps: [],
  pendingSteps: [],
  isComplete: true,
  completedAt: null,
);

final _kLoaded = ProfileLoaded(
  me: _kMe,
  stats: _kStats,
  ratings: const [],
  history: const [],
  playerProfile: _kPlayerProfile,
  onboardingStatus: _kOnboardingStatus,
  sportProfiles: const [],
  location: null,
  availability: const [],
  sports: const [],
  leaderboard: const [],
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Destino de prueba para `Routes.onboarding`: no necesita las dependencias
/// reales de `OnboardingFlowScreen` (OnboardingCubit vía getIt); solo debe
/// permitir comprobar que efectivamente se llegó a esa ruta.
const _onboardingDestinationKey = ValueKey('onboarding-destination-stub');

GoRouter _buildRouter({
  required _MockSessionCubit sessionCubit,
  required _MockProfileCubit profileCubit,
}) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => MultiBlocProvider(
          providers: [
            BlocProvider<SessionCubit>.value(value: sessionCubit),
            BlocProvider<ProfileCubit>.value(value: profileCubit),
          ],
          child: const ProfileScreen(),
        ),
      ),
      GoRoute(
        path: Routes.settings,
        builder: (context, state) => const ProfileSettingsScreen(),
      ),
      GoRoute(
        path: Routes.onboarding,
        builder: (context, state) =>
            const Scaffold(key: _onboardingDestinationKey, body: SizedBox()),
      ),
    ],
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  late _MockSessionCubit sessionCubit;
  late _MockProfileCubit profileCubit;

  setUp(() {
    sessionCubit = _MockSessionCubit();
    profileCubit = _MockProfileCubit();
    when(
      () => sessionCubit.state,
    ).thenReturn(const SessionState.authenticated());
    when(() => profileCubit.load()).thenAnswer((_) async {});
    when(() => profileCubit.state).thenReturn(_kLoaded);
    whenListen(profileCubit, Stream.value(_kLoaded), initialState: _kLoaded);
  });

  testWidgets(
    'main profile screen exposes a direct "Editar perfil" action that '
    'navigates to the onboarding route in one tap',
    (tester) async {
      final router = _buildRouter(
        sessionCubit: sessionCubit,
        profileCubit: profileCubit,
      );

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();

      final editAction = find.byKey(const ValueKey('profile-edit-action'));
      expect(editAction, findsOneWidget);
      expect(find.text('Editar perfil'), findsOneWidget);

      await tester.tap(editAction);
      await tester.pumpAndSettle();

      expect(find.byKey(_onboardingDestinationKey), findsOneWidget);
    },
  );

  testWidgets(
    'the main screen\'s "Editar perfil" action lands on the same route as '
    'the Settings screen\'s existing "Editar perfil" row',
    (tester) async {
      final router = _buildRouter(
        sessionCubit: sessionCubit,
        profileCubit: profileCubit,
      );

      // Primero navegamos a Ajustes y tocamos su fila "Editar perfil"
      // existente: debe llegar al único destino registrado para
      // Routes.onboarding en este router de prueba.
      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();
      router.push(Routes.settings);
      await tester.pumpAndSettle();

      await tester.tap(find.text('Editar perfil'));
      await tester.pumpAndSettle();
      expect(find.byKey(_onboardingDestinationKey), findsOneWidget);

      // Volvemos a Perfil (pantalla principal) y tocamos la nueva acción
      // directa: como solo existe una ruta registrada para
      // Routes.onboarding, llegar aquí prueba que es el mismo destino.
      router.go('/');
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const ValueKey('profile-edit-action')));
      await tester.pumpAndSettle();
      expect(find.byKey(_onboardingDestinationKey), findsOneWidget);
    },
  );
}
