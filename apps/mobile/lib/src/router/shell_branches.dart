import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/config/feature_flags.dart';

import '../features/home/presentation/home_screen.dart';
import '../features/matches/presentation/open_matches_screen.dart';
import '../features/notifications/presentation/notifications_screen.dart';
import '../features/profile/presentation/profile_screen.dart';
import '../features/tournaments/presentation/tournaments_home_screen.dart';

// ---------------------------------------------------------------------------
// Branch navigator keys — one GlobalKey per tab so GoRouter can maintain
// independent navigation stacks for each branch.
// ---------------------------------------------------------------------------

final _homeNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'home-branch');
final _partidasNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'partidas-branch');
final _torneosNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'torneos-branch');
final _avisosNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'avisos-branch');
final _perfilNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'perfil-branch');

// ---------------------------------------------------------------------------
// Branch definitions
// ---------------------------------------------------------------------------

final _homeBranch = StatefulShellBranch(
  navigatorKey: _homeNavigatorKey,
  routes: [
    GoRoute(
      path: '/home',
      builder: (context, state) => const HomeScreen(),
    ),
  ],
);

final _partidasBranch = StatefulShellBranch(
  navigatorKey: _partidasNavigatorKey,
  routes: [
    GoRoute(
      path: '/partidas',
      builder: (context, state) => const OpenMatchesScreen(),
    ),
  ],
);

final _torneosBranch = StatefulShellBranch(
  navigatorKey: _torneosNavigatorKey,
  routes: [
    GoRoute(
      path: '/torneos',
      builder: (context, state) => const TournamentsHomeScreen(),
    ),
  ],
);

final _avisosBranch = StatefulShellBranch(
  navigatorKey: _avisosNavigatorKey,
  routes: [
    GoRoute(
      path: '/avisos',
      builder: (context, state) => const NotificationsScreen(),
    ),
  ],
);

final _perfilBranch = StatefulShellBranch(
  navigatorKey: _perfilNavigatorKey,
  routes: [
    GoRoute(
      path: '/perfil',
      builder: (context, state) => const ProfileScreen(),
    ),
  ],
);

// ---------------------------------------------------------------------------
// Public — the list of branches passed to StatefulShellRoute.indexedStack.
// Order here determines the tab index (0 = home, 1 = partidas, ...).
// Torneos is conditionally included based on [FeatureFlags.torneosEnabled].
// ---------------------------------------------------------------------------

List<StatefulShellBranch> get shellBranches => [
      _homeBranch,
      _partidasBranch,
      if (FeatureFlags.torneosEnabled) _torneosBranch,
      _avisosBranch,
      _perfilBranch,
    ];
