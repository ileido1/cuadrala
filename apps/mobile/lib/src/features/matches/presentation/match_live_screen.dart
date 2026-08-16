import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/theme/app_icons.dart';
import '../../../router/routes.dart';
import '../data/matches_repository.dart';
import 'cubit/match_live_cubit.dart';
import 'cubit/match_live_state.dart';

final class MatchLiveScreen extends StatelessWidget {
  const MatchLiveScreen({super.key, required this.matchId});

  final String matchId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => MatchLiveCubit(
        matchesRepository: getIt<MatchesRepository>(),
        matchId: matchId,
      )..load(),
      child: const _MatchLiveView(),
    );
  }
}

final class _MatchLiveView extends StatelessWidget {
  const _MatchLiveView();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return BlocListener<MatchLiveCubit, MatchLiveState>(
      listenWhen: (prev, curr) =>
          curr is MatchLiveStateLoaded && curr.shouldNavigateToResult,
      listener: (context, state) {
        if (state is MatchLiveStateLoaded) {
          context.push(Routes.matchResult(state.match.id));
        }
      },
      child: Scaffold(
        key: const Key('match.live'),
        backgroundColor: scheme.surface,
        appBar: AppBar(
          title: const Text('Partido en vivo'),
          leading: IconButton(
            icon: const Icon(AppIcons.arrowBack),
            onPressed: () => Routes.popOrGoPartidas(context),
          ),
        ),
        body: BlocBuilder<MatchLiveCubit, MatchLiveState>(
          builder: (context, state) {
            if (state is MatchLiveStateInitial || state is MatchLiveStateLoading) {
              return const Center(child: CircularProgressIndicator());
            }

            if (state is MatchLiveStateNotFound) {
              return Center(
                child: Text('Partida no encontrada', style: Theme.of(context).textTheme.titleLarge),
              );
            }

            if (state is MatchLiveStateFailure) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(state.message),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => context.read<MatchLiveCubit>().load(),
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              );
            }

            final loaded = state as MatchLiveStateLoaded;
            final m = loaded.match;
            final hours = loaded.elapsedSeconds ~/ 3600;
            final minutes = (loaded.elapsedSeconds % 3600) ~/ 60;
            final seconds = loaded.elapsedSeconds % 60;

            return SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  //? Cronómetro
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    decoration: BoxDecoration(
                      color: scheme.primaryContainer,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      children: [
                        Text(
                          'Tiempo transcurrido',
                          style: TextStyle(
                            fontSize: 14,
                            color: scheme.onPrimaryContainer,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}',
                          style: TextStyle(
                            fontSize: 48,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                            color: scheme.onPrimaryContainer,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  //? Equipos (A vs B)
                  Row(
                    children: [
                      Expanded(
                        child: _TeamCard(
                          teamName: 'Equipo A',
                          color: scheme.primary,
                          onForeground: scheme.onPrimary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _TeamCard(
                          teamName: 'Equipo B',
                          color: scheme.secondary,
                          onForeground: scheme.onSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  //? Botón terminar partido
                  FilledButton.icon(
                    onPressed: loaded.submitting
                        ? null
                        : () => context.read<MatchLiveCubit>().endMatch(),
                    icon: const Icon(AppIcons.target, size: 20),
                    label: loaded.submitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Terminar partido'),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: scheme.errorContainer,
                      foregroundColor: scheme.onErrorContainer,
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
      ),
    );
  }
}

class _TeamCard extends StatelessWidget {
  const _TeamCard({
    required this.teamName,
    required this.color,
    required this.onForeground,
  });

  final String teamName;
  final Color color;
  final Color onForeground;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            teamName,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: onForeground,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '2/4',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w900,
              color: onForeground,
            ),
          ),
        ],
      ),
    );
  }
}
