import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'cubit/quick_match_cubit.dart';
import 'cubit/quick_match_state.dart';

final class QuickMatchScreen extends StatefulWidget {
  const QuickMatchScreen({super.key});
  @override
  State<QuickMatchScreen> createState() => _QuickMatchScreenState();
}

final class _QuickMatchScreenState extends State<QuickMatchScreen> {
  @override
  void initState() {
    super.initState();
    context.read<QuickMatchCubit>().load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Encontrar partida')),
    body: BlocBuilder<QuickMatchCubit, QuickMatchState>(
      builder: (context, state) {
        if (state is QuickMatchLoading || state is QuickMatchInitial)
          return const Center(child: CircularProgressIndicator());
        if (state is QuickMatchActive)
          return _Active(
            searching: state.search.status == 'SEARCHING',
            noMatchYet: state.search.noMatchYet,
          );
        return Center(
          child: FilledButton.icon(
            onPressed: () => context.read<QuickMatchCubit>().start({
              'sportId': '',
              'categoryId': '',
              'day': 'TODAY',
              'slots': ['EVENING'],
              'widenLevel': false,
              'zoneKm': 10,
              'includeOpenMatches': true,
            }),
            icon: const Icon(Icons.bolt),
            label: const Text('Entrar a la cola'),
          ),
        );
      },
    ),
  );
}

final class _Active extends StatelessWidget {
  const _Active({required this.searching, required this.noMatchYet});
  final bool searching, noMatchYet;
  @override
  Widget build(BuildContext c) => Padding(
    padding: const EdgeInsets.all(24),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.search, size: 88, color: Colors.green),
        const SizedBox(height: 20),
        Text(
          noMatchYet ? 'Seguimos buscando' : 'Buscando jugadores',
          style: Theme.of(c).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        const Text(
          'Te avisaremos apenas haya una opción. Puedes cerrar la app.',
        ),
        const SizedBox(height: 24),
        OutlinedButton(
          onPressed: () => c.read<QuickMatchCubit>().cancel(),
          child: const Text('Salir de la cola'),
        ),
      ],
    ),
  );
}
