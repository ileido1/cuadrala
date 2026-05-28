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
import '../features/availability/presentation/availability_screen.dart';
import '../features/availability/presentation/cubit/availability_cubit.dart';
import '../features/availability/data/availability_repository.dart';
import '../features/matches/presentation/match_detail_screen.dart';
import '../features/matches/presentation/match_lifecycle_screen.dart';
import '../features/matches/presentation/result_entry_screen.dart';
import '../features/chat/presentation/match_chat_screen.dart';
import '../features/chat/presentation/match_chat_read_only_screen.dart';
import '../features/chat/presentation/tournament_chat_screen.dart';
import '../features/chat/presentation/tournament_chat_read_only_screen.dart';
import '../features/matchmaking/presentation/matchmaking_screen.dart';
import '../features/monetization/presentation/pay_method_screen.dart';
import '../features/monetization/presentation/upload_receipt_screen.dart';
import '../features/monetization/presentation/waiting_confirmation_screen.dart';
import '../features/notifications/presentation/notification_detail_screen.dart';
import '../features/notifications/presentation/notification_prefs_screen.dart';
import '../features/onboarding/presentation/onboarding_flow_screen.dart';
import '../features/shell/presentation/shell_screen.dart';
import '../features/venues/data/models/venue_dto.dart';
import '../features/venues/presentation/venue_booking_screen.dart';
import '../features/venues/presentation/venue_map_screen.dart';
import '../features/venues/presentation/cubit/venue_booking_cubit.dart';
import '../features/venues/presentation/cubit/venue_map_cubit.dart';
import '../features/tournaments/presentation/create_tournament_screen.dart';
import '../features/tournaments/presentation/tournament_detail_screen.dart';
import 'auth_redirect.dart';
import 'go_router_refresh_stream.dart';
import 'routes.dart';
import 'shell_branches.dart';

final class AppRouter {
  AppRouter({required SessionCubit sessionCubit})
      : router = GoRouter(
          initialLocation: Routes.home,
          refreshListenable: GoRouterRefreshStream(sessionCubit.stream),
          redirect: (context, state) => authRedirect(sessionCubit.state, state),
          routes: [
            // ------------------------------------------------------------------
            // Auth / onboarding routes — outside the shell, no bottom nav
            // ------------------------------------------------------------------
            GoRoute(
              path: '/',
              redirect: (_, _) => Routes.home,
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

            // ------------------------------------------------------------------
            // Shell — StatefulShellRoute.indexedStack
            // Each tab is a StatefulShellBranch defined in shell_branches.dart.
            // The builder receives a StatefulNavigationShell that acts as both
            // the child widget and the tab-switch controller.
            // ------------------------------------------------------------------
            StatefulShellRoute.indexedStack(
              builder: (context, state, navigationShell) => ShellScreen(
                navigationShell: navigationShell,
              ),
              branches: shellBranches,
            ),

            // ------------------------------------------------------------------
            // Match routes — full-screen overlays OUTSIDE the shell.
            // These push above the shell so the bottom nav is not visible.
            // Deep links to these routes work without going through the shell.
            // ------------------------------------------------------------------
            GoRoute(
              path: Routes.createMatch,
              builder: (context, state) => BlocProvider<VenueMapCubit>(
                create: (_) => getIt<VenueMapCubit>()..load(),
                child: const VenueMapScreen(),
              ),
            ),
            GoRoute(
              path: '/matches/:matchId/result',
              builder: (context, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                return ResultEntryScreen(matchId: matchId);
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
              path: '/matches/:matchId/chat',
              builder: (context, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                return MatchChatScreen(matchId: matchId);
              },
            ),
            GoRoute(
              path: '/matches/:matchId/chat/readonly',
              builder: (context, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                return MatchChatReadOnlyScreen(matchId: matchId);
              },
            ),
            GoRoute(
              path: '/matches/:matchId/pay/method',
              builder: (context, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                final amountCents =
                    int.tryParse(state.uri.queryParameters['amountCents'] ?? '') ?? 0;
                final title = state.uri.queryParameters['title'] ?? 'Partida';
                final venueId = state.uri.queryParameters['venueId'];
                final currency = state.uri.queryParameters['currency'];
                final displayCurrency =
                    state.uri.queryParameters['displayCurrency'];
                final scheduledRaw =
                    state.uri.queryParameters['scheduledAt'];
                final scheduledAt = scheduledRaw != null
                    ? DateTime.tryParse(scheduledRaw)
                    : null;
                return PayMethodScreen(
                  matchId: matchId,
                  amountPerPlayerCents: amountCents,
                  matchTitle: title,
                  venueId: venueId,
                  pricingCurrency: currency,
                  displayCurrency: displayCurrency,
                  scheduledAt: scheduledAt,
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
                final currency = state.uri.queryParameters['currency'];
                final venueId = state.uri.queryParameters['venueId'];
                return UploadReceiptScreen(
                  matchId: matchId,
                  transactionId: tx,
                  method: method,
                  amountPerPersonCents: amountCents,
                  matchTitle: title,
                  pricingCurrency: currency,
                  venueId: venueId,
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
                final currency = state.uri.queryParameters['currency'];
                final tx = state.uri.queryParameters['tx'];
                final venueId = state.uri.queryParameters['venueId'];
                return WaitingConfirmationScreen(
                  matchId: matchId,
                  amountPerPersonCents: amountCents,
                  matchTitle: title,
                  pricingCurrency: currency,
                  transactionId: tx,
                  venueId: venueId,
                );
              },
            ),
            GoRoute(
              path: '/matches/:matchId/suggestions',
              builder: (context, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                return MatchmakingScreen(matchId: matchId);
              },
            ),
            // IMPORTANT: /matches/:matchId MUST be registered AFTER all
            // /matches/:matchId/* sub-routes so GoRouter matches sub-paths first.
            GoRoute(
              path: '/matches/:matchId',
              builder: (context, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                return MatchDetailScreen(matchId: matchId);
              },
            ),

            // ------------------------------------------------------------------
            // Tournament routes — full-screen overlays outside the shell
            // ------------------------------------------------------------------
            GoRoute(
              path: Routes.createTournament,
              builder: (context, state) => const CreateTournamentScreen(),
            ),
            GoRoute(
              path: '/tournaments/:tournamentId/chat',
              builder: (context, state) {
                final tournamentId = state.pathParameters['tournamentId'] ?? '';
                return TournamentChatScreen(tournamentId: tournamentId);
              },
            ),
            GoRoute(
              path: '/tournaments/:tournamentId/chat/readonly',
              builder: (context, state) {
                final tournamentId = state.pathParameters['tournamentId'] ?? '';
                return TournamentChatReadOnlyScreen(tournamentId: tournamentId);
              },
            ),
            GoRoute(
              path: '/tournaments/:tournamentId',
              builder: (context, state) {
                final tournamentId = state.pathParameters['tournamentId'] ?? '';
                return TournamentDetailScreen(tournamentId: tournamentId);
              },
            ),

            // ------------------------------------------------------------------
            // Notification routes — outside the shell (full-screen detail)
            // ------------------------------------------------------------------
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

            // ------------------------------------------------------------------
            // Other top-level overlays
            // ------------------------------------------------------------------
            GoRoute(
              path: Routes.availability,
              builder: (context, state) => BlocProvider<AvailabilityCubit>(
                create: (_) => getIt<AvailabilityCubit>(),
                child:
                    AvailabilityScreen(repository: getIt<AvailabilityRepository>()),
              ),
            ),
            GoRoute(
              path: '/venues/:venueId/create-match',
              builder: (context, state) {
                final venue = state.extra as VenueDto?;
                if (venue == null) {
                  return Scaffold(
                    appBar: AppBar(),
                    body: const Center(child: Text('Sede no disponible')),
                  );
                }
                return BlocProvider<VenueBookingCubit>(
                  create: (_) => VenueBookingCubit(
                    venue: venue,
                    venuesRepository: getIt(),
                    matchesRepository: getIt(),
                    catalogRepository: getIt(),
                  )..load(),
                  child: const VenueBookingScreen(),
                );
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
