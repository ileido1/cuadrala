import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/service_locator.dart';
import '../../home/presentation/cubit/home_cubit.dart';
import '../../home/presentation/home_screen.dart';
import '../../matches/presentation/cubit/open_matches_cubit.dart';
import '../../matches/presentation/open_matches_screen.dart';
import '../../profile/presentation/profile_screen.dart';
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
      const BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Inicio'),
      const BottomNavigationBarItem(icon: Icon(Icons.sports), label: 'Partidas'),
      const BottomNavigationBarItem(
        icon: Icon(Icons.emoji_events),
        label: 'Torneos',
      ),
      const BottomNavigationBarItem(
        icon: Icon(Icons.notifications),
        label: 'Notif.',
      ),
      const BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Perfil'),
    ];

    final pages = <Widget>[
      const HomeScreen(),
      const OpenMatchesScreen(),
      const Center(child: Text('Torneos')),
      const Center(child: Text('Notif.')),
      const ProfileScreen(),
    ];

    return BlocListener<ShellCubit, int>(
      listener: (context, tabIndex) {
        setState(() => _index = tabIndex);
      },
      child: Scaffold(
        appBar: AppBar(title: Text(items[_index].label ?? '')),
        body: IndexedStack(index: _index, children: pages),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: _index,
          items: items,
          onTap: (i) => context.read<ShellCubit>().selectTab(i),
          type: BottomNavigationBarType.fixed,
        ),
      ),
    );
  }

  int _index = 0;
}
