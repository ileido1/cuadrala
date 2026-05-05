import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/formatting/id_preview.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/formatting/scheduled_label.dart';
import '../data/matches_repository.dart';
import '../../profile/data/profile_repository.dart';
import 'cubit/match_detail_cubit.dart';
import 'cubit/match_detail_state.dart';

final class MatchDetailScreen extends StatelessWidget {
  const MatchDetailScreen({super.key, required this.matchId});

  final String matchId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => MatchDetailCubit(
        matchesRepository: getIt<MatchesRepository>(),
        profileRepository: getIt<ProfileRepository>(),
        matchId: matchId,
      )..load(),
      child: const _MatchDetailView(),
    );
  }
}

final class _MatchDetailView extends StatelessWidget {
  const _MatchDetailView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('match.detail'),
      appBar: AppBar(title: const Text('Detalle de partida')),
      body: BlocBuilder<MatchDetailCubit, MatchDetailState>(
        builder: (context, state) {
          if (state is MatchDetailLoading || state is MatchDetailInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is MatchDetailNotFound) {
            return const Center(child: Text('Partida no encontrada.'));
          }
          if (state is MatchDetailFailure) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(state.message, textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () => context.read<MatchDetailCubit>().load(),
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            );
          }

          final loaded = state as MatchDetailLoaded;
          final m = loaded.match;
          final scheme = Theme.of(context).colorScheme;

          final scheduled = m.scheduledAt;
          final scheduleText = scheduled == null
              ? 'Por confirmar'
              : '${shortDateLabel(scheduled)}, ${formatTimeHm(scheduled)} hs';

          final canJoin = m.status == 'SCHEDULED' && m.openSpots > 0;
          final isParticipant = loaded.isParticipant;

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  Chip(label: Text(m.status)),
                  Chip(label: Text('Tipo: ${m.type}')),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Partida ${idPreview(m.id)}',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                'Deporte: ${idPreview(m.sportId)}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              if (m.clubName != null || m.courtName != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.location_on, color: scheme.primary, size: 18),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        [
                          if (m.clubName != null) m.clubName!,
                          if (m.courtName != null) m.courtName!,
                        ].join(' • '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                    ),
                  ],
                ),
              ],
              if (m.locationLabel != null) ...[
                const SizedBox(height: 4),
                Text(
                  m.locationLabel!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _InfoTile(
                      title: 'Fecha',
                      value: scheduleText,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _InfoTile(
                      title: 'Precio',
                      value: '\$ ${formatMoneyCents(m.pricePerPlayerCents)} p/p',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _InfoTile(
                title: 'Cupos',
                value: '${m.participantCount}/${m.maxParticipants} (${m.openSpots} libres)',
              ),
              const SizedBox(height: 12),
              _InfoTile(
                title: 'Cancha',
                value: m.courtId == null
                    ? 'Sin cancha asignada'
                    : idPreview(m.courtId!),
              ),
              const SizedBox(height: 18),
              Text(
                'Jugadores',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 8),
              ...m.participants.map(
                (p) => Card(
                  child: ListTile(
                    title: Text('Usuario ${idPreview(p.userId)}'),
                    subtitle: Text('Se unió: ${formatTimeHm(p.joinedAt)}'),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'MVP: acciones (unirse/pagar) vienen en sprints siguientes.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
              ),
                  ],
                ),
              ),
              if (loaded.actionMessage != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: Text(
                    loaded.actionMessage!,
                    style: TextStyle(
                      color: scheme.primary,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: loaded.actionLoading
                          ? null
                          : isParticipant
                              ? () => context.read<MatchDetailCubit>().leave()
                              : canJoin
                                  ? () => context.read<MatchDetailCubit>().join()
                                  : null,
                      child: loaded.actionLoading
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(isParticipant ? 'Salir' : 'Unirme'),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

final class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.title, required this.value});

  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: scheme.onSurfaceVariant,
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
        ],
      ),
    );
  }
}

