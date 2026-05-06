import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

// ignore_for_file: use_build_context_synchronously

import '../../../core/di/service_locator.dart';
import '../../../core/formatting/id_preview.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/formatting/scheduled_label.dart';
import '../../../router/routes.dart';
import '../data/matches_repository.dart';
import '../../monetization/data/monetization_repository.dart';
import '../../monetization/presentation/pay_method_screen.dart';
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
    return Scaffold(
      key: const Key('match.detail'),
      appBar: AppBar(
        title: const Text('Detalle de partida'),
        actions: [
          BlocBuilder<MatchDetailCubit, MatchDetailState>(
            buildWhen: (prev, next) => next is MatchDetailLoaded,
            builder: (context, state) {
              if (state is! MatchDetailLoaded) return const SizedBox.shrink();
              final m = state.match;
              final finished = m.status == 'FINISHED';

              return PopupMenuButton<String>(
                onSelected: (value) async {
                  if (value == 'lifecycle') {
                    if (!context.mounted) return;
                    context.push(Routes.matchLifecycle(m.id));
                  }
                  if (value == 'chat') {
                    if (!context.mounted) return;
                    context.push(Routes.matchChat(m.id));
                  }
                  if (value == 'cancel') {
                    final cubit = context.read<MatchDetailCubit>();
                    final ok = await _confirm(
                      context,
                      title: 'Cancelar partida',
                      message: 'Se notificará a los jugadores.',
                      confirmLabel: 'Cancelar',
                    );
                    if (!ok) return;
                    await cubit.cancel();
                  }
                  if (value == 'start') {
                    final cubit = context.read<MatchDetailCubit>();
                    final ok = await _confirm(
                      context,
                      title: 'Iniciar partida',
                      message: '¿Confirmas que la partida empieza ahora?',
                      confirmLabel: 'Iniciar',
                    );
                    if (!ok) return;
                    await cubit.start();
                  }
                  if (value == 'finish') {
                    final cubit = context.read<MatchDetailCubit>();
                    final ok = await _confirm(
                      context,
                      title: 'Finalizar partida',
                      message: '¿Confirmas que la partida terminó?',
                      confirmLabel: 'Finalizar',
                    );
                    if (!ok) return;
                    await cubit.finish();
                  }
                  if (value == 'result') {
                    if (!context.mounted) return;
                    context.push(Routes.matchResult(m.id));
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'lifecycle',
                    child: Text('Ciclo de vida'),
                  ),
                  const PopupMenuItem(
                    value: 'chat',
                    child: Text('Chat'),
                  ),
                  if (finished)
                    const PopupMenuItem(
                      value: 'result',
                      child: Text('Cargar resultado'),
                    ),
                ],
              );
            },
          ),
        ],
      ),
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
          final isFinished = m.status == 'FINISHED';
          final hasPrice = m.pricePerPlayerCents > 0;

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
              ...m.participants.map((p) {
                return _ParticipantTile(
                  matchId: m.id,
                  userId: p.userId,
                  joinedAt: p.joinedAt,
                );
              }),
              const SizedBox(height: 12),
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
                          : isFinished
                              ? () => context.push(Routes.matchResult(m.id))
                              : (isParticipant && hasPrice)
                                  ? () => context.push(
                                        PayMethodScreen.route(
                                          matchId: m.id,
                                          amountPerPersonCents: m.pricePerPlayerCents,
                                          matchTitle: m.clubName ?? 'Partida',
                                        ),
                                      )
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
                          : Text(
                              isFinished
                                  ? 'Cargar resultado'
                                  : (isParticipant && hasPrice)
                                      ? 'Pagar ahora'
                                      : (isParticipant ? 'Salir' : 'Unirme'),
                            ),
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

final class _ParticipantTile extends StatefulWidget {
  const _ParticipantTile({
    required this.matchId,
    required this.userId,
    required this.joinedAt,
  });

  final String matchId;
  final String userId;
  final DateTime joinedAt;

  @override
  State<_ParticipantTile> createState() => _ParticipantTileState();
}

final class _ParticipantTileState extends State<_ParticipantTile> {
  late final Future<UserTransactionsResult> _future;

  @override
  void initState() {
    super.initState();
    _future = getIt<MonetizationRepository>().listUserTransactions(
      userId: widget.userId,
      limit: 100,
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _future,
      builder: (context, snapshot) {
        final txs = snapshot.data?.transactions ?? const [];
        final paid = txs.any((t) => t.matchId == widget.matchId && t.status == 'CONFIRMED');
        final scheme = Theme.of(context).colorScheme;
        return Card(
          child: ListTile(
            title: Text('Usuario ${idPreview(widget.userId)}'),
            subtitle: Text('Se unió: ${formatTimeHm(widget.joinedAt)}'),
            trailing: paid
                ? Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(999),
                      color: scheme.primary.withValues(alpha: 0.12),
                    ),
                    child: Text(
                      'Pagado',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: scheme.primary,
                          ),
                    ),
                  )
                : null,
          ),
        );
      },
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

