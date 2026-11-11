import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

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
import '../features/matches/presentation/discover_matches_screen.dart';
import '../features/quick_match/presentation/quick_match_screen.dart';
import '../features/quick_match/presentation/cubit/quick_match_cubit.dart';
import '../features/matches/presentation/match_detail_screen.dart';
import '../features/matches/presentation/match_live_screen.dart';
import '../features/matches/presentation/confirm_match_result_screen.dart';
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
import '../features/onboarding/presentation/my_sports_screen.dart';
import '../features/onboarding/presentation/onboarding_flow_screen.dart';
import '../features/profile/presentation/profile_settings_screen.dart';
import '../features/profile/presentation/public_profile_screen.dart';
import '../features/shell/presentation/shell_screen.dart';
import '../features/venue_detail/venue_detail_screen.dart';
import '../features/venues/data/models/venue_dto.dart';
import '../features/venues/presentation/create_match_panel.dart';
import '../features/venues/presentation/venue_booking_screen.dart';
import '../features/venues/presentation/cubit/venue_booking_cubit.dart';
import '../features/matches/presentation/cubit/discover_matches_cubit.dart';
import '../features/tournaments/presentation/create_tournament_screen.dart';
import '../features/tournaments/presentation/tournament_detail_screen.dart';
import '../features/tournament_invite_link/presentation/tournament_invite_link_register_screen.dart';
import '../features/tournament_invite_link/presentation/tournament_invite_links_screen.dart';
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
        observers: [SentryNavigatorObserver()],
        routes: [
          // ------------------------------------------------------------------
          // Auth / onboarding routes — outside the shell, no bottom nav
          // ------------------------------------------------------------------
          GoRoute(path: '/', redirect: (_, _) => Routes.home),
          GoRoute(
            name: 'welcome',
            path: Routes.welcome,
            builder: (context, state) => const WelcomeScreen(),
          ),
          GoRoute(
            name: 'login',
            path: Routes.login,
            builder: (context, state) => BlocProvider<LoginCubit>(
              create: (_) => getIt<LoginCubit>(),
              child: const LoginScreen(),
            ),
          ),
          GoRoute(
            name: 'register',
            path: Routes.register,
            builder: (context, state) => BlocProvider<RegisterCubit>(
              create: (_) => getIt<RegisterCubit>(),
              child: const RegisterScreen(),
            ),
          ),
          GoRoute(
            name: 'onboarding',
            path: Routes.onboarding,
            builder: (context, state) => const OnboardingFlowScreen(),
          ),
          GoRoute(
            name: 'profileSettings',
            path: Routes.settings,
            builder: (context, state) => const ProfileSettingsScreen(),
          ),
          GoRoute(
            name: 'publicProfile',
            path: Routes.publicProfile,
            builder: (context, state) => const PublicProfileScreen(),
          ),

          // ------------------------------------------------------------------
          // Shell — StatefulShellRoute.indexedStack
          // Each tab is a StatefulShellBranch defined in shell_branches.dart.
          // The builder receives a StatefulNavigationShell that acts as both
          // the child widget and the tab-switch controller.
          // ------------------------------------------------------------------
          StatefulShellRoute.indexedStack(
            builder: (context, state, navigationShell) =>
                ShellScreen(navigationShell: navigationShell),
            branches: shellBranches,
          ),

          // ------------------------------------------------------------------
          // Match routes — full-screen overlays OUTSIDE the shell.
          // These push above the shell so the bottom nav is not visible.
          // Deep links to these routes work without going through the shell.
          // ------------------------------------------------------------------
          GoRoute(
            name: 'quickMatch',
            path: Routes.quickMatch,
            builder: (context, state) => BlocProvider<QuickMatchCubit>(
              create: (_) => getIt<QuickMatchCubit>(),
              child: const QuickMatchScreen(),
            ),
          ),
          GoRoute(
            name: 'createMatch',
            path: Routes.createMatch,
            builder: (context, state) => const CreateMatchRouteScreen(),
          ),
          GoRoute(
            name: 'discoverMatches',
            path: Routes.discoverMatches,
            builder: (context, state) => BlocProvider<DiscoverMatchesCubit>(
              create: (_) => getIt<DiscoverMatchesCubit>(),
              child: const DiscoverMatchesScreen(),
            ),
          ),
          GoRoute(
            name: 'matchResult',
            path: '/matches/:matchId/result',
            builder: (context, state) {
              final matchId = state.pathParameters['matchId'] ?? '';
              return ResultEntryScreen(matchId: matchId);
            },
          ),
          GoRoute(
            name: 'matchChat',
            path: '/matches/:matchId/chat',
            builder: (context, state) {
              final matchId = state.pathParameters['matchId'] ?? '';
              return MatchChatScreen(matchId: matchId);
            },
          ),
          GoRoute(
            name: 'matchChatReadOnly',
            path: '/matches/:matchId/chat/readonly',
            builder: (context, state) {
              final matchId = state.pathParameters['matchId'] ?? '';
              return MatchChatReadOnlyScreen(matchId: matchId);
            },
          ),
          GoRoute(
            name: 'matchPayMethod',
            path: '/matches/:matchId/pay/method',
            builder: (context, state) {
              final matchId = state.pathParameters['matchId'] ?? '';
              final amountCents =
                  int.tryParse(
                    state.uri.queryParameters['amountCents'] ?? '',
                  ) ??
                  0;
              final title = state.uri.queryParameters['title'] ?? 'Partida';
              final venueId = state.uri.queryParameters['venueId'];
              final currency = state.uri.queryParameters['currency'];
              final displayCurrency =
                  state.uri.queryParameters['displayCurrency'];
              final scheduledRaw = state.uri.queryParameters['scheduledAt'];
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
            name: 'matchPayUploadReceipt',
            path: '/matches/:matchId/pay/upload-receipt',
            builder: (context, state) {
              final matchId = state.pathParameters['matchId'] ?? '';
              final tx = state.uri.queryParameters['tx'] ?? '';
              final method = state.uri.queryParameters['method'] ?? 'TRANSFER';
              final amountCents =
                  int.tryParse(
                    state.uri.queryParameters['amountCents'] ?? '',
                  ) ??
                  0;
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
            name: 'matchPayWaiting',
            path: '/matches/:matchId/pay/waiting',
            builder: (context, state) {
              final matchId = state.pathParameters['matchId'] ?? '';
              final amountCents =
                  int.tryParse(
                    state.uri.queryParameters['amountCents'] ?? '',
                  ) ??
                  0;
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
            name: 'matchSuggestions',
            path: '/matches/:matchId/suggestions',
            builder: (context, state) {
              final matchId = state.pathParameters['matchId'] ?? '';
              return MatchmakingScreen(matchId: matchId);
            },
          ),
          GoRoute(
            name: 'matchLive',
            path: '/matches/:matchId/live',
            builder: (context, state) {
              final matchId = state.pathParameters['matchId'] ?? '';
              return MatchLiveScreen(matchId: matchId);
            },
          ),
          GoRoute(
            name: 'matchConfirmResult',
            path: '/matches/:matchId/confirm-result',
            builder: (context, state) {
              final matchId = state.pathParameters['matchId'] ?? '';
              return ConfirmMatchResultScreen(matchId: matchId);
            },
          ),
          // IMPORTANT: /matches/:matchId MUST be registered AFTER all
          // /matches/:matchId/* sub-routes so GoRouter matches sub-paths first.
          GoRoute(
            name: 'matchDetail',
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
            name: 'createTournament',
            path: Routes.createTournament,
            builder: (context, state) => const CreateTournamentScreen(),
          ),
          GoRoute(
            name: 'tournamentChat',
            path: '/tournaments/:tournamentId/chat',
            builder: (context, state) {
              final tournamentId = state.pathParameters['tournamentId'] ?? '';
              return TournamentChatScreen(tournamentId: tournamentId);
            },
          ),
          GoRoute(
            name: 'tournamentChatReadOnly',
            path: '/tournaments/:tournamentId/chat/readonly',
            builder: (context, state) {
              final tournamentId = state.pathParameters['tournamentId'] ?? '';
              return TournamentChatReadOnlyScreen(tournamentId: tournamentId);
            },
          ),
          // Organizer-only screen to generate/list/revoke invite links
          // (issue #47, REQ-TIL-001/005/006). Requires session: this path
          // starts with Routes.tournaments, so authRedirect already treats
          // it as protected — no change needed in auth_redirect.dart.
          // IMPORTANT: must be registered BEFORE /tournaments/:tournamentId
          // (same reasoning as the /matches/:matchId sub-routes above) so
          // GoRouter matches this sub-path first.
          GoRoute(
            name: 'tournamentInviteLinks',
            path: '/tournaments/:tournamentId/invite-links',
            builder: (context, state) {
              final tournamentId = state.pathParameters['tournamentId'] ?? '';
              return TournamentInviteLinksScreen(tournamentId: tournamentId);
            },
          ),
          GoRoute(
            name: 'tournamentDetail',
            path: '/tournaments/:tournamentId',
            builder: (context, state) {
              final tournamentId = state.pathParameters['tournamentId'] ?? '';
              return TournamentDetailScreen(
                tournamentId: tournamentId,
                extra: state.extra,
                openInvitation:
                    state.uri.queryParameters['invitation'] == 'pending',
              );
            },
          ),

          // ------------------------------------------------------------------
          // Notification routes — outside the shell (full-screen detail)
          // ------------------------------------------------------------------
          GoRoute(
            name: 'notificationDetail',
            path: '/notifications/:notificationId',
            builder: (context, state) {
              final notificationId =
                  state.pathParameters['notificationId'] ?? '';
              return NotificationDetailScreen(notificationId: notificationId);
            },
          ),
          GoRoute(
            name: 'notificationPrefs',
            path: Routes.notificationPrefs,
            builder: (context, state) => const NotificationPrefsScreen(),
          ),

          // ------------------------------------------------------------------
          // Other top-level overlays
          // ------------------------------------------------------------------
          // Public deep link landing for tournament invite links (issue #47,
          // REQ-TIL-007/008/011/012). Opens without a session and without a
          // previous stack, same as Routes.availability below — '/invite'
          // does not start with any protected prefix in auth_redirect.dart,
          // so no change was needed there.
          GoRoute(
            name: 'tournamentInviteLinkRegister',
            path: '/invite/:token',
            builder: (context, state) {
              final token = state.pathParameters['token'] ?? '';
              return TournamentInviteLinkRegisterScreen(token: token);
            },
          ),
          GoRoute(
            name: 'availability',
            path: Routes.availability,
            builder: (context, state) => BlocProvider<AvailabilityCubit>(
              create: (_) => getIt<AvailabilityCubit>(),
              child: AvailabilityScreen(
                repository: getIt<AvailabilityRepository>(),
              ),
            ),
          ),
          GoRoute(
            name: 'mySports',
            path: Routes.mySports,
            builder: (context, state) => const MySportsScreen(),
          ),
          GoRoute(
            name: 'venueCreateMatch',
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
                  onboardingRepository: getIt(),
                )..load(),
                child: const VenueBookingScreen(),
              );
            },
          ),
          GoRoute(
            name: 'venueDetail',
            path: '/descubrir/:venueId',
            builder: (context, state) {
              final venueId = state.pathParameters['venueId'] ?? '';
              return VenueDetailScreen(venueId: venueId);
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
