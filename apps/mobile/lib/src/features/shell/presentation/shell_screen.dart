import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'dart:ui';

import '../../../core/di/service_locator.dart';
import '../../home/presentation/cubit/home_cubit.dart';
import '../../home/presentation/home_screen.dart';
import '../../matches/presentation/cubit/open_matches_cubit.dart';
import '../../matches/presentation/open_matches_screen.dart';
import '../../notifications/presentation/cubit/notifications_cubit.dart';
import '../../notifications/presentation/notifications_screen.dart';
import '../../profile/presentation/profile_screen.dart';
import '../../tournaments/presentation/tournaments_home_screen.dart';
import 'cubit/shell_cubit.dart';

final class ShellScreen extends StatelessWidget {
  const ShellScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => ShellCubit()),
        BlocProvider(create: (_) => getIt<HomeCubit>()),
        BlocProvider(create: (_) => getIt<OpenMatchesCubit>()),
        BlocProvider(create: (_) => getIt<NotificationsCubit>()),
      ],
      child: const _ShellView(),
    );
  }
}

final class _ShellView extends StatefulWidget {
  const _ShellView();

  @override
  State<_ShellView> createState() => _ShellViewState();
}

class _ShellViewState extends State<_ShellView> {
  @override
  Widget build(BuildContext context) {
    final items = <BottomNavigationBarItem>[
      const BottomNavigationBarItem(icon: Icon(Icons.home_outlined), label: 'Inicio'),
      const BottomNavigationBarItem(icon: Icon(Icons.search_outlined), label: 'Partidas'),
      const BottomNavigationBarItem(
        icon: Icon(Icons.emoji_events_outlined),
        label: 'Torneos',
      ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.notifications_none_outlined),
        label: 'Notif.',
      ),
      const BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Perfil'),
    ];

    final pages = <Widget>[
      const HomeScreen(),
      const OpenMatchesScreen(),
      const TournamentsHomeScreen(),
      const NotificationsScreen(),
      const ProfileScreen(),
    ];

    return BlocListener<ShellCubit, int>(
      listener: (context, tabIndex) {
        setState(() => _index = tabIndex);
      },
      child: Scaffold(
        body: IndexedStack(index: _index, children: pages),
        bottomNavigationBar: _BlurBottomNav(
          child: BottomNavigationBar(
            currentIndex: _index,
            items: items,
            onTap: (i) => context.read<ShellCubit>().selectTab(i),
            type: BottomNavigationBarType.fixed,
            backgroundColor: Colors.transparent,
            elevation: 0,
            selectedItemColor: Theme.of(context).colorScheme.primary,
            unselectedItemColor: Theme.of(context).colorScheme.onSurfaceVariant,
            showUnselectedLabels: true,
            selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
          ),
        ),
      ),
    );
  }

  int _index = 0;
}

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
            border: Border(top: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.7))),
          ),
          child: SafeArea(top: false, child: child),
        ),
      ),
    );
  }
}
