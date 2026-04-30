import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../core/di/service_locator.dart';
import '../features/auth/presentation/cubit/login_cubit.dart';
import '../features/auth/presentation/cubit/register_cubit.dart';
import '../features/auth/presentation/cubit/session_cubit.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/auth/presentation/register_screen.dart';
import '../features/matches/presentation/match_detail_screen.dart';
import '../features/notifications/presentation/notification_detail_screen.dart';
import '../features/shell/presentation/shell_screen.dart';
import '../features/tournaments/presentation/tournament_detail_screen.dart';
import 'auth_redirect.dart';
import 'go_router_refresh_stream.dart';
import 'routes.dart';

final class AppRouter {
  AppRouter({required SessionCubit sessionCubit})
      : router = GoRouter(
          initialLocation: Routes.home,
          refreshListenable: GoRouterRefreshStream(sessionCubit.stream),
          redirect: (context, state) => authRedirect(sessionCubit.state, state),
          routes: [
            GoRoute(
              path: '/',
              redirect: (_, __) => Routes.home,
            ),
            GoRoute(
              path: Routes.login,
              builder: (context, state) => BlocProvider<LoginCubit>(
                create: (_) => getIt<LoginCubit>(),
                child: const LoginScreen(),
              ),
            ),
            GoRoute(
              path: Routes.register,
              builder: (context, state) => BlocProvider<RegisterCubit>(
                create: (_) => getIt<RegisterCubit>(),
                child: const RegisterScreen(),
              ),
            ),
            GoRoute(
              path: Routes.home,
              builder: (context, state) => const ShellScreen(),
            ),
            GoRoute(
              path: '/matches/:matchId',
              builder: (context, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                return MatchDetailScreen(matchId: matchId);
              },
            ),
            GoRoute(
              path: '/tournaments/:tournamentId',
              builder: (context, state) {
                final tournamentId = state.pathParameters['tournamentId'] ?? '';
                return TournamentDetailScreen(tournamentId: tournamentId);
              },
            ),
            GoRoute(
              path: '/notifications/:notificationId',
              builder: (context, state) {
                final notificationId =
                    state.pathParameters['notificationId'] ?? '';
                return NotificationDetailScreen(notificationId: notificationId);
              },
            ),
          ],
          errorBuilder: (context, state) => Scaffold(
            body: Center(
              child: Text(
                'Ruta no encontrada',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
          ),
        );

  final GoRouter router;
}

