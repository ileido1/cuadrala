import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/theme/app_icons.dart';
import '../../../router/routes.dart';
import '../data/matches_repository.dart';
import '../data/models/match_detail_dto.dart';
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
      // Solo en la transición false -> true: el timer emite cada segundo con
      // el flag aún activo y antes apilaba una página de resultado por tick.
      listenWhen: (prev, curr) =>
          curr is MatchLiveStateLoaded &&
          curr.shouldNavigateToResult &&
          !(prev is MatchLiveStateLoaded && prev.shouldNavigateToResult),
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
                            //? Dígitos tabulares de la fuente del tema en vez
                            //? de 'monospace' fijo: ese fontFamily descartaba
                            //? Plus Jakarta y en el golden salía como bloques.
                            fontFeatures: const [FontFeature.tabularFigures()],
                            color: scheme.onPrimaryContainer,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  //? Jugadores reales de la partida. Antes había dos tarjetas
                  //? "Equipo A/B" con un "2/4" fijo que no salía de ningún
                  //? dato: los equipos recién se arman al cargar el resultado.
                  _PlayersCard(match: loaded.match),
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

class _PlayersCard extends StatelessWidget {
  const _PlayersCard({required this.match});

  final MatchDetailDto match;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final players = match.participants;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Jugadores (${players.length})',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          for (final player in players)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Icon(AppIcons.person, size: 18, color: scheme.primary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      player.displayName ?? 'Jugador',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 4),
          Text(
            'Al terminar, cargás los equipos y el marcador.',
            style: TextStyle(fontSize: 12.5, color: scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}
