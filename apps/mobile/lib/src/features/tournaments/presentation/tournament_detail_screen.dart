import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/theme/app_icons.dart';
import '../../../router/routes.dart';
import '../data/models/tournament_schedule_dto.dart';
import '../data/models/tournament_scoreboard_dto.dart';
import 'cubit/tournament_registrations_cubit.dart';
import 'cubit/tournament_registrations_state.dart';
import 'cubit/tournament_schedule_cubit.dart';
import 'cubit/tournament_schedule_state.dart';
import 'cubit/tournament_scoreboard_cubit.dart';
import 'cubit/tournament_scoreboard_state.dart';

final class TournamentDetailScreen extends StatelessWidget {
  const TournamentDetailScreen({super.key, required this.tournamentId});

  final String tournamentId;

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (_) => getIt<TournamentScheduleCubit>(param1: tournamentId)..load(),
        ),
        BlocProvider(
          create: (_) => getIt<TournamentScoreboardCubit>(param1: tournamentId)..load(),
        ),
        BlocProvider(
          create: (_) => getIt<TournamentRegistrationsCubit>(param1: tournamentId)..load(),
        ),
      ],
      child: DefaultTabController(
        length: 3,
        child: Scaffold(
          key: const Key('tournament.detail'),
          appBar: AppBar(
            title: const Text('Torneo'),
            actions: [
              IconButton(
                onPressed: () => context.push(Routes.tournamentChat(tournamentId)),
                icon: const Icon(AppIcons.chat),
                tooltip: 'Chat del torneo',
              ),
            ],
            bottom: const TabBar(
              tabs: [
                Tab(text: 'Fixture'),
                Tab(text: 'Tabla'),
                Tab(text: 'Inscripciones'),
              ],
            ),
          ),
          body: TabBarView(
            children: [
              _ScheduleTab(tournamentId: tournamentId),
              _ScoreboardTab(tournamentId: tournamentId),
              _RegistrationsTab(tournamentId: tournamentId),
            ],
          ),
        ),
      ),
    );
  }
}

final class _ScheduleTab extends StatelessWidget {
  const _ScheduleTab({required this.tournamentId});

  final String tournamentId;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      child: BlocBuilder<TournamentScheduleCubit, TournamentScheduleState>(
        builder: (context, state) {
          return switch (state) {
            TournamentScheduleInitial() => const Center(child: CircularProgressIndicator()),
            TournamentScheduleLoading() => const Center(child: CircularProgressIndicator()),
            TournamentScheduleGenerating() => const Center(child: CircularProgressIndicator()),
            TournamentScheduleUnsupported() => const _InfoBox(
                message: 'Este torneo no soporta generación automática de fixture.',
              ),
            TournamentScheduleConflict() => const _InfoBox(
                message: 'Ya existe un fixture generado. Refresca para verlo.',
              ),
            TournamentScheduleEmpty() => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _InfoBox(message: 'Aún no hay fixture para este torneo.'),
                  const SizedBox(height: 12),
                  BlocBuilder<TournamentRegistrationsCubit, TournamentRegistrationsState>(
                    builder: (context, regState) {
                      final participantIds = regState is TournamentRegistrationsLoaded
                          ? regState.items.map((r) => r.userId).toList()
                          : <String>[];
                      return FilledButton.icon(
                        onPressed: participantIds.length >= 2
                            ? () => context.read<TournamentScheduleCubit>().generate(
                                  participantUserIds: participantIds,
                                )
                            : null,
                        icon: const Icon(AppIcons.sparkle),
                        label: Text(
                          participantIds.length >= 2
                              ? 'Generar fixture'
                              : 'Se necesitan al menos 2 inscritos',
                        ),
                      );
                    },
                  ),
                ],
              ),
            TournamentScheduleError(:final message) => _ErrorBox(
                message: message,
                onRetry: () => context.read<TournamentScheduleCubit>().load(),
              ),
            TournamentScheduleSuccess(:final schedule) => _ScheduleList(schedule: schedule),
          };
        },
      ),
    );
  }
}

final class _ScoreboardTab extends StatelessWidget {
  const _ScoreboardTab({required this.tournamentId});

  final String tournamentId;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      child: BlocBuilder<TournamentScoreboardCubit, TournamentScoreboardState>(
        builder: (context, state) {
          return switch (state) {
            TournamentScoreboardInitial() => const Center(child: CircularProgressIndicator()),
            TournamentScoreboardLoading() => const Center(child: CircularProgressIndicator()),
            TournamentScoreboardEmpty() => const _InfoBox(
                message: 'Aún no hay tabla para este torneo.',
              ),
            TournamentScoreboardError(:final message) => _ErrorBox(
                message: message,
                onRetry: () => context.read<TournamentScoreboardCubit>().load(),
              ),
            TournamentScoreboardSuccess(:final scoreboard) =>
              _ScoreboardTable(scoreboard: scoreboard),
          };
        },
      ),
    );
  }
}

final class _RegistrationsTab extends StatelessWidget {
  const _RegistrationsTab({required this.tournamentId});

  final String tournamentId;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      child: BlocBuilder<TournamentRegistrationsCubit, TournamentRegistrationsState>(
        builder: (context, state) {
          if (state is TournamentRegistrationsLoading || state is TournamentRegistrationsInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is TournamentRegistrationsFailure) {
            return _ErrorBox(
              message: state.message,
              onRetry: () => context.read<TournamentRegistrationsCubit>().load(),
            );
          }

          final loaded = state as TournamentRegistrationsLoaded;
          final activeItems = loaded.items.where((r) => r.status != 'WITHDRAWN').toList();

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                '${activeItems.length} inscrito${activeItems.length == 1 ? '' : 's'}',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              if (loaded.registerError != null) ...[
                const SizedBox(height: 8),
                Text(
                  loaded.registerError!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
              const SizedBox(height: 12),
              Expanded(
                child: activeItems.isEmpty
                    ? const _InfoBox(message: 'Aún no hay inscritos en este torneo.')
                    : ListView.separated(
                        itemCount: activeItems.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final reg = activeItems[index];
                          return Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                                  child: Text(
                                    reg.userId.substring(0, 2).toUpperCase(),
                                    style: TextStyle(
                                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        reg.userId,
                                        style: const TextStyle(fontWeight: FontWeight.w600),
                                      ),
                                      Text(
                                        reg.status,
                                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

final class _ScheduleList extends StatelessWidget {
  const _ScheduleList({required this.schedule});

  final TournamentScheduleDto schedule;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      children: [
        for (final round in schedule.rounds) ...[
          Text(
            round.name.isEmpty ? 'Ronda' : round.name,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 10),
          if (round.matches.isEmpty)
            Text(
              'Sin partidos.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                  ),
            )
          else
            ...round.matches.map(
              (m) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: scheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: scheme.outlineVariant),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          m.label.isEmpty ? 'Partido' : m.label,
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                      ),
                      Text(
                        m.status,
                        style: TextStyle(
                          color: scheme.onSurfaceVariant,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          const SizedBox(height: 16),
        ],
      ],
    );
  }
}

final class _ScoreboardTable extends StatelessWidget {
  const _ScoreboardTable({required this.scoreboard});

  final TournamentScoreboardDto scoreboard;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final rows = scoreboard.rows;
    if (rows.isEmpty) {
      return const _InfoBox(message: 'Aún no hay tabla para este torneo.');
    }
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        columns: const [
          DataColumn(label: Text('Equipo')),
          DataColumn(label: Text('Pts')),
        ],
        rows: rows
            .map(
              (r) => DataRow(
                cells: [
                  DataCell(Text(r.teamName.isEmpty ? r.teamId : r.teamName)),
                  DataCell(
                    Text(
                      '${r.points}',
                      style: TextStyle(
                        color: scheme.primary,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
            )
            .toList(),
      ),
    );
  }
}

final class _InfoBox extends StatelessWidget {
  const _InfoBox({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: SelectableText.rich(
        TextSpan(
          text: message,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
              ),
        ),
      ),
    );
  }
}

final class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.errorContainer.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.error.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SelectableText.rich(
            TextSpan(
              text: message,
              style: TextStyle(
                color: scheme.error,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(AppIcons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }
}
