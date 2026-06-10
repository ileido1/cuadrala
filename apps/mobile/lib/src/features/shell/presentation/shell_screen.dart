import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config/feature_flags.dart';
import '../../../core/theme/brand_colors.dart';
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

        final scheme = Theme.of(context).colorScheme;
        final items = [
          for (var i = 0; i < resolvedTabs.length; i++)
            BottomNavigationBarItem(
              icon: _buildIcon(
                tab: resolvedTabs[i],
                unreadCount: unreadCount,
                active: false,
                scheme: scheme,
              ),
              activeIcon: _buildIcon(
                tab: resolvedTabs[i],
                unreadCount: unreadCount,
                active: true,
                scheme: scheme,
              ),
              label: resolvedTabs[i].label,
            ),
        ];

        return Scaffold(
          body: child,
          bottomNavigationBar: _ShellBottomNav(
            child: BottomNavigationBar(
              currentIndex: currentIndex,
              items: items,
              onTap: onSelectTab,
              type: BottomNavigationBarType.fixed,
              backgroundColor: Colors.transparent,
              elevation: 0,
              selectedItemColor: scheme.primary,
              unselectedItemColor: const Color(0xFF94A3B8),
              showUnselectedLabels: true,
              selectedLabelStyle: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 11,
              ),
              unselectedLabelStyle: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 11,
              ),
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
  required ColorScheme scheme,
}) {
  final icon = Icon(active ? tab.activeIcon : tab.inactiveIcon);

  final isAvisosTab = tab.label == 'Avisos';
  if (!isAvisosTab || unreadCount == 0) return icon;

  final cappedCount = unreadCount > 99 ? 99 : unreadCount;
  final label = cappedCount >= 99 ? '99+' : '$cappedCount';
  return Stack(
    clipBehavior: Clip.none,
    children: [
      icon,
      Positioned(
        top: -3,
        right: -6,
        child: Container(
          constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
          padding: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            color: BrandColors.limeAccent,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: scheme.surfaceContainerLow, width: 1.5),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: Color(0xFF15301A),
              height: 1,
            ),
          ),
        ),
      ),
    ],
  );
}

// ---------------------------------------------------------------------------
// Bottom nav — handoff: bg-2, borde superior, safe area inferior
// ---------------------------------------------------------------------------

final class _ShellBottomNav extends StatelessWidget {
  const _ShellBottomNav({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLow,
        border: Border(
          top: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.7)),
        ),
      ),
      child: SafeArea(
        top: false,
        minimum: const EdgeInsets.only(bottom: 8),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(6, 8, 6, 0),
          child: child,
        ),
      ),
    );
  }
}
