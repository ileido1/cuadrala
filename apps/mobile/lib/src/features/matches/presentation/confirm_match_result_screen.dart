import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/theme/app_icons.dart';
import '../data/matches_repository.dart';
import 'cubit/confirm_result_cubit.dart';
import 'cubit/confirm_result_state.dart';

final class ConfirmMatchResultScreen extends StatelessWidget {
  const ConfirmMatchResultScreen({super.key, required this.matchId});

  final String matchId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => ConfirmResultCubit(
        matchesRepository: getIt<MatchesRepository>(),
        matchId: matchId,
      )..load(),
      child: const _ConfirmResultView(),
    );
  }
}

final class _ConfirmResultView extends StatelessWidget {
  const _ConfirmResultView();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      key: const Key('confirm.result'),
      backgroundColor: scheme.surfaceContainerLowest,
      appBar: AppBar(
        title: const Text('Confirmar resultado'),
        leading: IconButton(
          icon: const Icon(AppIcons.arrowBack),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocBuilder<ConfirmResultCubit, ConfirmResultState>(
        builder: (context, state) {
          if (state is ConfirmResultStateInitial || state is ConfirmResultStateLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is ConfirmResultStateNotFound) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(AppIcons.info, size: 48, color: scheme.onSurfaceVariant),
                  const SizedBox(height: 16),
                  Text(
                    'No hay resultado pendiente',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: () => context.pop(),
                    child: const Text('Volver'),
                  ),
                ],
              ),
            );
          }

          if (state is ConfirmResultStateFailure) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(state.message),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.read<ConfirmResultCubit>().load(),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }

          final loaded = state as ConfirmResultStateLoaded;
          final draft = loaded.draft;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                //? Información de quien cargó el resultado
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: scheme.surfaceContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Resultado propuesto por:',
                        style: TextStyle(
                          fontSize: 12,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        draft.proposedByName ?? 'Jugador desconocido',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                //? Resultado propuesto
                Text(
                  'Resultado propuesto',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _ResultTeamCard(
                        teamName: 'Equipo A',
                        sets: draft.teamASetWins ?? 0,
                        points: draft.teamAPoints ?? 0,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _ResultTeamCard(
                        teamName: 'Equipo B',
                        sets: draft.teamBSetWins ?? 0,
                        points: draft.teamBPoints ?? 0,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                //? Botones Confirmar/Rechazar
                FilledButton.icon(
                  onPressed: loaded.submitting
                      ? null
                      : () => context.read<ConfirmResultCubit>().confirmResult(),
                  icon: const Icon(AppIcons.check, size: 20),
                  label: loaded.submitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Confirmar resultado'),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: loaded.submitting ? null : () => _showRejectDialog(context),
                  icon: const Icon(AppIcons.close, size: 20),
                  label: const Text('Rechazar'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    foregroundColor: scheme.error,
                  ),
                ),

                if (loaded.error != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: scheme.errorContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      loaded.error!,
                      style: TextStyle(color: scheme.onErrorContainer),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  void _showRejectDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Rechazar resultado'),
        content: const Text('¿Estás seguro de que deseas rechazar este resultado?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<ConfirmResultCubit>().rejectResult();
            },
            child: const Text('Rechazar'),
          ),
        ],
      ),
    );
  }
}

class _ResultTeamCard extends StatelessWidget {
  const _ResultTeamCard({
    required this.teamName,
    required this.sets,
    required this.points,
  });

  final String teamName;
  final int sets;
  final int points;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: scheme.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            teamName,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: scheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            '$sets',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w900,
              color: scheme.onSurface,
            ),
          ),
          Text(
            'sets',
            style: TextStyle(
              fontSize: 12,
              color: scheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '$points pts',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: scheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}
