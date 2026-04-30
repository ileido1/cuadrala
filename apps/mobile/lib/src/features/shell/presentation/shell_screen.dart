import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../auth/presentation/cubit/session_cubit.dart';
import '../../../shared/widgets/danger_button.dart';

final class ShellScreen extends StatefulWidget {
  const ShellScreen({super.key});

  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> {
  int _index = 0;

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
      const Center(child: Text('Inicio')),
      const Center(child: Text('Partidas')),
      const Center(child: Text('Torneos')),
      const Center(child: Text('Notif.')),
      Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: DangerButton(
            label: 'Cerrar sesión',
            onPressed: () async {
              await context.read<SessionCubit>().logout();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Sesión cerrada.')),
                );
              }
            },
          ),
        ),
      ),
    ];

    return Scaffold(
      appBar: AppBar(title: Text(items[_index].label ?? '')),
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        items: items,
        onTap: (i) => setState(() => _index = i),
        type: BottomNavigationBarType.fixed,
      ),
    );
  }
}
