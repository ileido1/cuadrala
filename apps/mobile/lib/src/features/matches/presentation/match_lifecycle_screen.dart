import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/formatting/id_preview.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/formatting/scheduled_label.dart';
import '../../monetization/data/monetization_repository.dart';
import '../../profile/data/profile_repository.dart';
import '../data/matches_repository.dart';
import 'cubit/match_detail_cubit.dart';
import 'cubit/match_detail_state.dart';
import 'open_match_display.dart';

final class MatchLifecycleScreen extends StatelessWidget {
  const MatchLifecycleScreen({super.key, required this.matchId});

  final String matchId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => MatchDetailCubit(
        matchesRepository: getIt<MatchesRepository>(),
        profileRepository: getIt<ProfileRepository>(),
        monetizationRepository: getIt<MonetizationRepository>(),
        matchId: matchId,
      )..load(),
      child: const _MatchLifecycleView(),
    );
  }
}

final class _MatchLifecycleView extends StatelessWidget {
  const _MatchLifecycleView();

  Future<bool> _confirm(
    BuildContext context, {
    required String title,
    required String message,
    required String confirmLabel,
  }) async {
    final res = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Volver'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
    return res == true;
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      key: const Key('match.lifecycle'),
      appBar: AppBar(title: const Text('Partida — Ciclo de Vida')),
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

          final scheduled = m.scheduledAt;
          final scheduleText = scheduled == null
              ? 'Por confirmar'
              : '${shortDateLabel(scheduled)}, ${formatTimeHm(scheduled)} hs';

          final isScheduled = m.status == 'SCHEDULED';
          final inProgress = m.status == 'IN_PROGRESS';
          final finished = m.status == 'FINISHED';

          final canCancel = isScheduled;
          final canStart = isScheduled;
          final canFinish = inProgress;

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
                        _StatusChip(label: 'PROGRAMADA', active: isScheduled),
                        _StatusChip(label: 'EN CURSO', active: inProgress),
                        _StatusChip(label: 'FINALIZADA', active: finished),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: const [
                        _GhostChip(label: 'ERROR 403'),
                        _GhostChip(label: 'ERROR 409'),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _InfoChip(
                      icon: Icons.check_circle,
                      label: 'PATCH /cancel disponible · POST /start disponible',
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        gradient: LinearGradient(
                          colors: [
                            scheme.primary.withValues(alpha: 0.9),
                            scheme.primaryContainer.withValues(alpha: 0.35),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 8,
                            children: [
                              _Pill(
                                text: m.status,
                                background: scheme.surface.withValues(alpha: 0.22),
                                foreground: scheme.onPrimary,
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            'Pádel Mixto · 5ta',
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(
                                  fontWeight: FontWeight.w900,
                                  color: scheme.onPrimary,
                                ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(Icons.location_on,
                                  size: 16, color: scheme.onPrimary),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  [
                                    if (m.clubName != null) m.clubName!,
                                    if (m.courtName != null) m.courtName!,
                                  ].where((e) => e.isNotEmpty).join(', '),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodyMedium
                                      ?.copyWith(
                                        color: scheme.onPrimary.withValues(alpha: 0.9),
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(Icons.schedule,
                                  size: 16, color: scheme.onPrimary),
                              const SizedBox(width: 6),
                              Text(
                                scheduleText,
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(
                                      color: scheme.onPrimary.withValues(alpha: 0.9),
                                      fontWeight: FontWeight.w700,
                                    ),
                              ),
                              const SizedBox(width: 12),
                              Icon(Icons.payments,
                                  size: 16, color: scheme.onPrimary),
                              const SizedBox(width: 6),
                              Text(
                                formatMoneyCents(
                                  m.pricePerPlayerCents,
                                  matchDetailDisplayCurrency(m),
                                ),
                                style: Theme.of(context)
                                    .textTheme
                                    .bodyMedium
                                    ?.copyWith(
                                      color: scheme.onPrimary.withValues(alpha: 0.9),
                                      fontWeight: FontWeight.w700,
                                    ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Text(
                          'Jugadores (${m.participantCount}/${m.maxParticipants})',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w900,
                              ),
                        ),
                        const Spacer(),
                        _Pill(
                          text: '${m.participantCount}/${m.maxParticipants} Anotados',
                          background: scheme.primary.withValues(alpha: 0.12),
                          foreground: scheme.primary,
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ...m.participants.map(
                      (p) => Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            child: Text(idPreview(p.userId, maxChars: 2)),
                          ),
                          title: Text('Usuario ${idPreview(p.userId)}'),
                          subtitle: Text('Joined: ${shortDateLabel(p.joinedAt)}'),
                          trailing: _Pill(
                            text: 'Pagado',
                            background: scheme.primary.withValues(alpha: 0.12),
                            foreground: scheme.primary,
                          ),
                        ),
                      ),
                    ),
                    if (loaded.actionMessage != null) ...[
                      const SizedBox(height: 12),
                      _InfoChip(
                        icon: Icons.info_outline,
                        label: loaded.actionMessage!,
                      ),
                    ],
                  ],
                ),
              ),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: loaded.actionLoading || !canCancel
                              ? null
                              : () async {
                                  final cubit = context.read<MatchDetailCubit>();
                                  final ok = await _confirm(
                                    context,
                                    title: 'Cancelar partida',
                                    message: 'Se notificará a los jugadores.',
                                    confirmLabel: 'Cancelar',
                                  );
                                  if (!ok) return;
                                  await cubit.cancel();
                                },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: scheme.error,
                            side: BorderSide(color: scheme.error),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          icon: const Icon(Icons.close),
                          label: const Text('Cancelar'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: loaded.actionLoading
                              ? null
                              : canStart
                                  ? () async {
                                      final cubit =
                                          context.read<MatchDetailCubit>();
                                      final ok = await _confirm(
                                        context,
                                        title: 'Iniciar partida',
                                        message:
                                            '¿Confirmas que la partida empieza ahora?',
                                        confirmLabel: 'Iniciar',
                                      );
                                      if (!ok) return;
                                      await cubit.start();
                                    }
                                  : canFinish
                                      ? () async {
                                          final cubit =
                                              context.read<MatchDetailCubit>();
                                          final ok = await _confirm(
                                            context,
                                            title: 'Finalizar partida',
                                            message:
                                                '¿Confirmas que la partida terminó?',
                                            confirmLabel: 'Finalizar',
                                          );
                                          if (!ok) return;
                                          await cubit.finish();
                                        }
                                      : null,
                          style: FilledButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          icon: loaded.actionLoading
                              ? const SizedBox(
                                  height: 18,
                                  width: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : Icon(canFinish ? Icons.flag : Icons.play_arrow),
                          label: Text(canFinish ? 'Finalizar' : 'Iniciar'),
                        ),
                      ),
                    ],
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

final class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.active});
  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Chip(
      label: Text(
        label,
        style: TextStyle(
          fontWeight: FontWeight.w900,
          color: active ? scheme.onPrimary : scheme.onSurfaceVariant,
        ),
      ),
      backgroundColor: active ? scheme.primary : scheme.surfaceContainerHighest,
      side: BorderSide(
        color: active ? scheme.primary : scheme.outlineVariant,
      ),
    );
  }
}

final class _GhostChip extends StatelessWidget {
  const _GhostChip({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Chip(
      label: Text(
        label,
        style: TextStyle(
          fontWeight: FontWeight.w900,
          color: scheme.onSurfaceVariant,
        ),
      ),
      backgroundColor: scheme.surfaceContainerHighest,
      side: BorderSide(color: scheme.outlineVariant),
    );
  }
}

final class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: scheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: scheme.primary.withValues(alpha: 0.18)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: scheme.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: scheme.onSurface,
                  ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

final class _Pill extends StatelessWidget {
  const _Pill({
    required this.text,
    required this.background,
    required this.foreground,
  });

  final String text;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w900,
              color: foreground,
            ),
      ),
    );
  }
}

