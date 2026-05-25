import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'dart:ui';

import '../../../core/config/feature_flags.dart';
import '../../../core/di/service_locator.dart';
import '../../home/presentation/cubit/home_cubit.dart';
import '../../matches/presentation/cubit/open_matches_cubit.dart';
import '../../notifications/presentation/cubit/notifications_cubit.dart';
import '../../notifications/presentation/cubit/notifications_state.dart';
import '../../profile/presentation/cubit/profile_cubit.dart';

// ---------------------------------------------------------------------------
// Tab descriptor — keeps icon pairs + label together so index remapping
// is driven by a single source of truth when tabs are conditionally hidden.
// ---------------------------------------------------------------------------

class ShellTabConfig {
  const ShellTabConfig({
    required this.activeIcon,
    required this.inactiveIcon,
    required this.label,
  });

  final IconData activeIcon;
  final IconData inactiveIcon;
  final String label;
}

final _defaultTabs = [
  const ShellTabConfig(
    activeIcon: Icons.home,
    inactiveIcon: Icons.home_outlined,
    label: 'Inicio',
  ),
  const ShellTabConfig(
    activeIcon: Icons.sports_tennis,
    inactiveIcon: Icons.sports_tennis_outlined,
    label: 'Partidas',
  ),
  const ShellTabConfig(
    activeIcon: Icons.emoji_events,
    inactiveIcon: Icons.emoji_events_outlined,
    label: 'Torneos',
  ),
  const ShellTabConfig(
    activeIcon: Icons.notifications,
    inactiveIcon: Icons.notifications_outlined,
    label: 'Avisos',
  ),
  const ShellTabConfig(
    activeIcon: Icons.person,
    inactiveIcon: Icons.person_outlined,
    label: 'Perfil',
  ),
];

List<ShellTabConfig> _filterTabs(List<ShellTabConfig> tabs) => [
      for (final t in tabs)
        if (t.label != 'Torneos' || FeatureFlags.torneosEnabled) t,
    ];

// ---------------------------------------------------------------------------
// Shell entry point — wires DI-owned cubits and bridges to StatefulShellRoute
// ---------------------------------------------------------------------------

final class ShellScreen extends StatelessWidget {
  /// Called by StatefulShellRoute.indexedStack builder.
  const ShellScreen({
    super.key,
    required this.navigationShell,
  });

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => getIt<HomeCubit>()),
        BlocProvider(create: (_) => getIt<OpenMatchesCubit>()),
        BlocProvider(
          create: (_) => getIt<NotificationsCubit>()..load(),
        ),
        BlocProvider(create: (_) => getIt<ProfileCubit>()),
      ],
      child: ShellBody(
        currentIndex: navigationShell.currentIndex,
        onSelectTab: (i) => navigationShell.goBranch(
          i,
          initialLocation: i == navigationShell.currentIndex,
        ),
        child: navigationShell,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// ShellBody — testable, stateless.
//
// Accepts:
//   [currentIndex]  — active tab index (driven by StatefulNavigationShell)
//   [onSelectTab]   — called when user taps a nav item
//   [child]         — the branch navigator widget (StatefulNavigationShell)
//   [tabs]          — optional override for tests (stub tab configs)
// ---------------------------------------------------------------------------

class ShellBody extends StatelessWidget {
  const ShellBody({
    super.key,
    required this.currentIndex,
    required this.onSelectTab,
    required this.child,
    this.tabs,
  });

  final int currentIndex;
  final void Function(int index) onSelectTab;
  final Widget child;

  /// Override tabs for testing. When null, defaults to the real app tabs
  /// (filtered by feature flags).
  final List<ShellTabConfig>? tabs;

  @override
  Widget build(BuildContext context) {
    final resolvedTabs = tabs ?? _filterTabs(_defaultTabs);

    return BlocBuilder<NotificationsCubit, NotificationsState>(
      builder: (context, notifState) {
        final unreadCount = notifState.items.where((n) => n.isUnread).length;

        final items = [
          for (var i = 0; i < resolvedTabs.length; i++)
            BottomNavigationBarItem(
              icon: _buildIcon(
                tab: resolvedTabs[i],
                unreadCount: unreadCount,
                active: false,
              ),
              activeIcon: _buildIcon(
                tab: resolvedTabs[i],
                unreadCount: unreadCount,
                active: true,
              ),
              label: resolvedTabs[i].label,
            ),
        ];

        return Scaffold(
          body: child,
          bottomNavigationBar: _BlurBottomNav(
            child: BottomNavigationBar(
              currentIndex: currentIndex,
              items: items,
              onTap: onSelectTab,
              type: BottomNavigationBarType.fixed,
              backgroundColor: Colors.transparent,
              elevation: 0,
              selectedItemColor: Theme.of(context).colorScheme.primary,
              unselectedItemColor:
                  Theme.of(context).colorScheme.onSurfaceVariant,
              showUnselectedLabels: true,
              selectedLabelStyle: const TextStyle(
                  fontWeight: FontWeight.w800, fontSize: 11),
              unselectedLabelStyle: const TextStyle(
                  fontWeight: FontWeight.w700, fontSize: 11),
            ),
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Icon builder — handles active/inactive shape + optional unread badge
// ---------------------------------------------------------------------------

Widget _buildIcon({
  required ShellTabConfig tab,
  required int unreadCount,
  required bool active,
}) {
  final icon = Icon(active ? tab.activeIcon : tab.inactiveIcon);

  final isAvisosTab = tab.label == 'Avisos';
  if (!isAvisosTab || unreadCount == 0) return icon;

  final cappedCount = unreadCount > 99 ? 99 : unreadCount;
  final label = cappedCount >= 99 ? '99+' : '$cappedCount';
  return Badge(label: Text(label), child: icon);
}

// ---------------------------------------------------------------------------
// Blurred bottom nav container
// ---------------------------------------------------------------------------

final class _BlurBottomNav extends StatelessWidget {
  const _BlurBottomNav({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          decoration: BoxDecoration(
            color: scheme.surface.withValues(alpha: 0.82),
            border: Border(
                top: BorderSide(
                    color: scheme.outlineVariant.withValues(alpha: 0.7))),
          ),
          child: SafeArea(top: false, child: child),
        ),
      ),
    );
  }
}
