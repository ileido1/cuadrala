import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../core/config/feature_flags.dart';
import '../core/di/service_locator.dart';
import '../core/theme/app_icons.dart';

import '../features/home/presentation/home_screen.dart';
import '../features/matches/presentation/open_matches_screen.dart';
import '../features/notifications/presentation/notifications_screen.dart';
import '../features/profile/presentation/profile_screen.dart';
import '../features/tournaments/presentation/tournaments_home_screen.dart';
import '../features/venues/presentation/cubit/venue_map_cubit.dart';
import '../features/venues/presentation/venue_map_screen.dart';
import 'routes.dart';

// ---------------------------------------------------------------------------
// Branch navigator keys — one GlobalKey per tab so GoRouter can maintain
// independent navigation stacks for each branch.
// ---------------------------------------------------------------------------

final _homeNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'home-branch');
final _partidasNavigatorKey = GlobalKey<NavigatorState>(
  debugLabel: 'partidas-branch',
);
final _torneosNavigatorKey = GlobalKey<NavigatorState>(
  debugLabel: 'torneos-branch',
);
final _descubrirNavigatorKey = GlobalKey<NavigatorState>(
  debugLabel: 'descubrir-branch',
);
final _avisosNavigatorKey = GlobalKey<NavigatorState>(
  debugLabel: 'avisos-branch',
);
final _perfilNavigatorKey = GlobalKey<NavigatorState>(
  debugLabel: 'perfil-branch',
);

// ---------------------------------------------------------------------------
// Branch definitions
// ---------------------------------------------------------------------------

final _homeBranch = StatefulShellBranch(
  navigatorKey: _homeNavigatorKey,
  routes: [
    GoRoute(path: Routes.home, builder: (context, state) => const HomeScreen()),
  ],
);

final _partidasBranch = StatefulShellBranch(
  navigatorKey: _partidasNavigatorKey,
  routes: [
    GoRoute(
      path: Routes.partidas,
      builder: (context, state) => const OpenMatchesScreen(),
    ),
  ],
);

final _torneosBranch = StatefulShellBranch(
  navigatorKey: _torneosNavigatorKey,
  routes: [
    GoRoute(
      path: Routes.torneos,
      builder: (context, state) => const TournamentsHomeScreen(),
    ),
  ],
);

final _descubrirBranch = StatefulShellBranch(
  navigatorKey: _descubrirNavigatorKey,
  routes: [
    GoRoute(
      path: Routes.descubrir,
      builder: (context, state) => BlocProvider<VenueMapCubit>(
        create: (_) => getIt<VenueMapCubit>(),
        child: const VenueMapScreen(),
      ),
    ),
  ],
);

final _avisosBranch = StatefulShellBranch(
  navigatorKey: _avisosNavigatorKey,
  routes: [
    GoRoute(
      path: Routes.avisos,
      builder: (context, state) => const NotificationsScreen(),
    ),
  ],
);

final _perfilBranch = StatefulShellBranch(
  navigatorKey: _perfilNavigatorKey,
  routes: [
    GoRoute(
      path: Routes.perfil,
      builder: (context, state) => const ProfileScreen(),
    ),
  ],
);

// ---------------------------------------------------------------------------
// Canonical shell destinations. Branches and bottom-navigation tabs are both
// projected from this list so their indexes cannot drift when a flag changes.
// ---------------------------------------------------------------------------

final class ShellDestination {
  const ShellDestination({
    required this.path,
    required this.label,
    required this.activeIcon,
    required this.inactiveIcon,
    required this.branch,
  });

  final String path;
  final String label;
  final IconData activeIcon;
  final IconData inactiveIcon;
  final StatefulShellBranch branch;
}

final _homeDestination = ShellDestination(
  path: Routes.home,
  label: 'Inicio',
  activeIcon: AppIcons.home,
  inactiveIcon: AppIcons.home,
  branch: _homeBranch,
);

final _partidasDestination = ShellDestination(
  path: Routes.partidas,
  label: 'Partidas',
  activeIcon: AppIcons.calendar,
  inactiveIcon: AppIcons.calendar,
  branch: _partidasBranch,
);

final _torneosDestination = ShellDestination(
  path: Routes.torneos,
  label: 'Torneos',
  activeIcon: AppIcons.trophy,
  inactiveIcon: AppIcons.trophy,
  branch: _torneosBranch,
);

final _descubrirDestination = ShellDestination(
  path: Routes.descubrir,
  label: 'Descubrir',
  activeIcon: AppIcons.explore,
  inactiveIcon: AppIcons.explore,
  branch: _descubrirBranch,
);

final _avisosDestination = ShellDestination(
  path: Routes.avisos,
  label: 'Avisos',
  activeIcon: AppIcons.bell,
  inactiveIcon: AppIcons.bell,
  branch: _avisosBranch,
);

final _perfilDestination = ShellDestination(
  path: Routes.perfil,
  label: 'Perfil',
  activeIcon: AppIcons.person,
  inactiveIcon: AppIcons.person,
  branch: _perfilBranch,
);

List<ShellDestination> shellDestinations({
  bool tournamentsEnabled = FeatureFlags.torneosEnabled,
}) => [
  _homeDestination,
  _partidasDestination,
  if (tournamentsEnabled) _torneosDestination,
  _descubrirDestination,
  _avisosDestination,
  _perfilDestination,
];

List<StatefulShellBranch> shellBranchesFor({
  bool tournamentsEnabled = FeatureFlags.torneosEnabled,
}) => [
  for (final destination in shellDestinations(
    tournamentsEnabled: tournamentsEnabled,
  ))
    destination.branch,
];

List<StatefulShellBranch> get shellBranches => shellBranchesFor();
