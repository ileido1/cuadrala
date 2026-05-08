import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../core/di/service_locator.dart';
import '../features/auth/presentation/cubit/login_cubit.dart';
import '../features/auth/presentation/cubit/register_cubit.dart';
import '../features/auth/presentation/cubit/session_cubit.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/auth/presentation/register_screen.dart';
import '../features/auth/presentation/welcome_screen.dart';
import '../features/matches/presentation/match_detail_screen.dart';
import '../features/matches/presentation/create_match_screen.dart';
import '../features/matches/presentation/match_lifecycle_screen.dart';
import '../features/matches/presentation/result_draft_screen.dart';
import '../features/chat/presentation/match_chat_screen.dart';
import '../features/chat/presentation/tournament_chat_screen.dart';
import '../features/matchmaking/presentation/matchmaking_screen.dart';
import '../features/monetization/presentation/pay_method_screen.dart';
import '../features/monetization/presentation/upload_receipt_screen.dart';
import '../features/monetization/presentation/waiting_confirmation_screen.dart';
import '../features/notifications/presentation/notification_detail_screen.dart';
import '../features/notifications/presentation/notification_prefs_screen.dart';
import '../features/onboarding/presentation/onboarding_flow_screen.dart';
import '../features/shell/presentation/shell_screen.dart';
import '../features/tournaments/presentation/create_tournament_screen.dart';
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
              path: Routes.welcome,
              builder: (context, state) => const WelcomeScreen(),
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
              path: Routes.onboarding,
              builder: (context, state) => const OnboardingFlowScreen(),
            ),
            GoRoute(
              path: Routes.home,
              builder: (context, state) => const ShellScreen(),
            ),
            GoRoute(
              path: Routes.createMatch,
              builder: (context, state) => const CreateMatchScreen(),
            ),
            GoRoute(
              path: '/matches/:matchId/result',
              builder: (context, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                return ResultDraftScreen(matchId: matchId);
              },
            ),
            GoRoute(
              path: '/matches/:matchId/lifecycle',
              builder: (context, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                return MatchLifecycleScreen(matchId: matchId);
              },
            ),
            GoRoute(
              path: '/matches/:matchId',
              builder: (context, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                return MatchDetailScreen(matchId: matchId);
              },
            ),
            GoRoute(
              path: '/matches/:matchId/chat',
              builder: (context, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                return MatchChatScreen(matchId: matchId);
              },
            ),
            GoRoute(
              path: '/matches/:matchId/pay/method',
              builder: (context, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                final amountCents =
                    int.tryParse(state.uri.queryParameters['amountCents'] ?? '') ?? 0;
                final title = state.uri.queryParameters['title'] ?? 'Partida';
                return PayMethodScreen(
                  matchId: matchId,
                  amountPerPersonCents: amountCents,
                  matchTitle: title,
                );
              },
            ),
            GoRoute(
              path: '/matches/:matchId/pay/upload-receipt',
              builder: (context, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                final tx = state.uri.queryParameters['tx'] ?? '';
                final method = state.uri.queryParameters['method'] ?? 'TRANSFER';
                final amountCents =
                    int.tryParse(state.uri.queryParameters['amountCents'] ?? '') ?? 0;
                final title = state.uri.queryParameters['title'] ?? 'Partida';
                return UploadReceiptScreen(
                  matchId: matchId,
                  transactionId: tx,
                  method: method,
                  amountPerPersonCents: amountCents,
                  matchTitle: title,
                );
              },
            ),
            GoRoute(
              path: '/matches/:matchId/pay/waiting',
              builder: (context, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                final amountCents =
                    int.tryParse(state.uri.queryParameters['amountCents'] ?? '') ?? 0;
                final title = state.uri.queryParameters['title'] ?? 'Partida';
                return WaitingConfirmationScreen(
                  matchId: matchId,
                  amountPerPersonCents: amountCents,
                  matchTitle: title,
                );
              },
            ),
            GoRoute(
              path: Routes.createTournament,
              builder: (context, state) => const CreateTournamentScreen(),
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
            GoRoute(
              path: Routes.notificationPrefs,
              builder: (context, state) => const NotificationPrefsScreen(),
            ),
            GoRoute(
              path: '/matches/:matchId/suggestions',
              builder: (context, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                return MatchmakingScreen(matchId: matchId);
              },
            ),
            GoRoute(
              path: '/tournaments/:tournamentId/chat',
              builder: (context, state) {
                final tournamentId = state.pathParameters['tournamentId'] ?? '';
                return TournamentChatScreen(tournamentId: tournamentId);
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

