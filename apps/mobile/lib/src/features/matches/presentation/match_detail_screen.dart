import 'dart:math' as math;

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
import '../data/models/match_detail_dto.dart';
import '../../monetization/data/monetization_repository.dart';
import '../../monetization/presentation/pay_method_screen.dart';
import '../../profile/data/profile_repository.dart';
import 'cubit/match_detail_cubit.dart';
import 'cubit/match_detail_state.dart';

// ─── Entry Point ────────────────────────────────────────────────────────────

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

// ─── Main View ───────────────────────────────────────────────────────────────

final class _MatchDetailView extends StatelessWidget {
  const _MatchDetailView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('match.detail'),
      backgroundColor: Theme.of(context).colorScheme.surface,
      body: BlocBuilder<MatchDetailCubit, MatchDetailState>(
        builder: (context, state) {
          if (state is MatchDetailLoading || state is MatchDetailInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is MatchDetailNotFound) {
            return _EmptyState(
              icon: Icons.sports_outlined,
              title: 'Partida no encontrada',
              subtitle: 'Es posible que haya sido eliminada.',
              action: TextButton(
                onPressed: () {
                  if (context.canPop()) context.pop();
                },
                child: const Text('Volver'),
              ),
            );
          }
          if (state is MatchDetailFailure) {
            return _EmptyState(
              icon: Icons.wifi_off_outlined,
              title: 'Error al cargar',
              subtitle: state.message,
              action: FilledButton(
                onPressed: () => context.read<MatchDetailCubit>().load(),
                child: const Text('Reintentar'),
              ),
            );
          }

          final loaded = state as MatchDetailLoaded;
          final m = loaded.match;
          final isParticipant = loaded.isParticipant;
          final isOrganizer = m.participants.isNotEmpty &&
              m.participants.first.userId == loaded.viewerUserId;
          final canJoin = m.status == 'SCHEDULED' && m.openSpots > 0;
          final isFinished = m.status == 'FINISHED';
          final hasPrice = m.pricePerPlayerCents > 0;

          return Column(
            children: [
              // ── Scrollable body ──────────────────────────────────────────
              Expanded(
                child: CustomScrollView(
                  slivers: [
                    _HeroSliverAppBar(
                      match: m,
                      isOrganizer: isOrganizer,
                    ),
                    SliverToBoxAdapter(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (isParticipant) _ParticipantBanner(hasPrice: hasPrice, matchId: m.id, amountCents: m.pricePerPlayerCents, clubName: m.clubName),
                          _MatchInfoSection(match: m),
                          const Divider(height: 1, indent: 20, endIndent: 20),
                          _PlayersSection(match: m),
                          const SizedBox(height: 100),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // ── Sticky bottom bar ────────────────────────────────────────
              _BottomBar(
                loaded: loaded,
                canJoin: canJoin,
                isParticipant: isParticipant,
                isFinished: isFinished,
                hasPrice: hasPrice,
              ),
            ],
          );
        },
      ),
    );
  }
}

// ─── Hero Sliver App Bar ─────────────────────────────────────────────────────

final class _HeroSliverAppBar extends StatelessWidget {
  const _HeroSliverAppBar({required this.match, required this.isOrganizer});

  final MatchDetailDto match;
  final bool isOrganizer;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final m = match;
    final scheduled = m.scheduledAt;
    final scheduleText = scheduled == null
        ? 'Por confirmar'
        : '${shortDateLabel(scheduled)}, ${formatTimeHm(scheduled)} hs';

    return SliverAppBar(
      expandedHeight: 200,
      pinned: true,
      backgroundColor: scheme.surface,
      surfaceTintColor: Colors.transparent,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: () {
          if (context.canPop()) {
            context.pop();
          }
        },
      ),
      actions: [
        if (isOrganizer)
          IconButton(
            icon: const Icon(Icons.more_horiz),
            tooltip: 'Acciones',
            onPressed: () => _showOrganizerSheet(context, m),
          ),
        const SizedBox(width: 4),
      ],
      flexibleSpace: FlexibleSpaceBar(
        collapseMode: CollapseMode.pin,
        background: _HeroBanner(match: m, scheduleText: scheduleText),
      ),
    );
  }

  void _showOrganizerSheet(BuildContext context, MatchDetailDto m) {
    final cubit = context.read<MatchDetailCubit>();
    final isFinished = m.status == 'FINISHED';

    showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Theme.of(ctx).colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: Text(
                  'Gestionar partida',
                  style: Theme.of(ctx).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
              _SheetAction(
                icon: Icons.chat_bubble_outline,
                label: 'Abrir chat',
                onTap: () {
                  Navigator.pop(ctx);
                  context.push(Routes.matchChat(m.id));
                },
              ),
              if (m.status == 'SCHEDULED')
                _SheetAction(
                  icon: Icons.play_circle_outline,
                  label: 'Iniciar partida',
                  onTap: () async {
                    Navigator.pop(ctx);
                    final ok = await _confirmDialog(
                      context,
                      title: 'Iniciar partida',
                      message: '¿Confirmas que la partida empieza ahora?',
                      confirmLabel: 'Iniciar',
                    );
                    if (ok) cubit.start();
                  },
                ),
              if (m.status == 'IN_PROGRESS')
                _SheetAction(
                  icon: Icons.stop_circle_outlined,
                  label: 'Finalizar partida',
                  onTap: () async {
                    Navigator.pop(ctx);
                    final ok = await _confirmDialog(
                      context,
                      title: 'Finalizar partida',
                      message: '¿Confirmas que la partida terminó?',
                      confirmLabel: 'Finalizar',
                    );
                    if (ok) cubit.finish();
                  },
                ),
              if (isFinished)
                _SheetAction(
                  icon: Icons.scoreboard_outlined,
                  label: 'Cargar resultado',
                  onTap: () {
                    Navigator.pop(ctx);
                    context.push(Routes.matchResult(m.id));
                  },
                ),
              if (m.status != 'CANCELLED' && m.status != 'FINISHED')
                _SheetAction(
                  icon: Icons.cancel_outlined,
                  label: 'Cancelar partida',
                  isDestructive: true,
                  onTap: () async {
                    Navigator.pop(ctx);
                    final ok = await _confirmDialog(
                      context,
                      title: 'Cancelar partida',
                      message: 'Se notificará a los jugadores.',
                      confirmLabel: 'Cancelar',
                    );
                    if (ok) cubit.cancel();
                  },
                ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Future<bool> _confirmDialog(
    BuildContext context, {
    required String title,
    required String message,
    required String confirmLabel,
  }) async {
    final res = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Volver'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
    return res == true;
  }
}

final class _HeroBanner extends StatelessWidget {
  const _HeroBanner({required this.match, required this.scheduleText});

  final MatchDetailDto match;
  final String scheduleText;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final m = match;

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            scheme.primaryContainer.withValues(alpha: 0.7),
            scheme.surface,
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 56, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Row(
                children: [
                  _StatusBadge(status: m.status),
                  const SizedBox(width: 8),
                  _SoftBadge(label: m.categoryName ?? m.type),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                m.clubName ?? 'Partida sin sede',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, height: 1.1),
              ),
              const SizedBox(height: 4),
              if (m.courtName != null || m.locationLabel != null)
                Row(
                  children: [
                    Icon(Icons.place_outlined, size: 15, color: scheme.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        [
                          if (m.courtName != null) m.courtName!,
                          if (m.locationLabel != null) m.locationLabel!,
                        ].join(' · '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13,
                          color: scheme.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Participant Banner ──────────────────────────────────────────────────────

final class _ParticipantBanner extends StatelessWidget {
  const _ParticipantBanner({
    required this.hasPrice,
    required this.matchId,
    required this.amountCents,
    required this.clubName,
  });

  final bool hasPrice;
  final String matchId;
  final int amountCents;
  final String? clubName;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(Icons.check_circle_outline, color: scheme.primary, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ya estás anotado',
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    color: scheme.onPrimaryContainer,
                  ),
                ),
                if (hasPrice)
                  Text(
                    'Recuerda pagar tu cuota antes del partido',
                    style: TextStyle(
                      fontSize: 12,
                      color: scheme.onPrimaryContainer.withValues(alpha: 0.75),
                    ),
                  ),
              ],
            ),
          ),
          if (hasPrice)
            TextButton(
              onPressed: () => context.push(
                PayMethodScreen.route(
                  matchId: matchId,
                  amountPerPersonCents: amountCents,
                  matchTitle: clubName ?? 'Partida',
                ),
              ),
              child: const Text('Pagar'),
            ),
        ],
      ),
    );
  }
}

// ─── Match Info Section ──────────────────────────────────────────────────────

final class _MatchInfoSection extends StatelessWidget {
  const _MatchInfoSection({required this.match});

  final MatchDetailDto match;

  @override
  Widget build(BuildContext context) {
    final m = match;
    final scheduled = m.scheduledAt;
    final scheduleText = scheduled == null
        ? 'Por confirmar'
        : '${shortDateLabel(scheduled)}, ${formatTimeHm(scheduled)} hs';
    final hasPrice = m.pricePerPlayerCents > 0;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 20),
      child: Row(
        children: [
          Expanded(
            child: _InfoTile(
              icon: Icons.calendar_month_outlined,
              label: 'FECHA',
              value: scheduleText,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _InfoTile(
              icon: Icons.payments_outlined,
              label: 'PRECIO',
              value: hasPrice
                  ? '\$ ${formatMoneyCents(m.pricePerPlayerCents)} p/p'
                  : 'Gratis',
              highlight: hasPrice,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Players Section ─────────────────────────────────────────────────────────

final class _PlayersSection extends StatelessWidget {
  const _PlayersSection({required this.match});

  final MatchDetailDto match;

  @override
  Widget build(BuildContext context) {
    final m = match;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Jugadores',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
              _SoftBadge(
                label: '${m.participantCount}/${m.maxParticipants}',
                emphasize: true,
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...m.participants.map(
            (p) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _PlayerTile(
                matchId: m.id,
                userId: p.userId,
                displayName: p.displayName,
                joinedAt: p.joinedAt,
              ),
            ),
          ),
          for (int i = 0; i < m.openSpots; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _EmptySlot(),
            ),
        ],
      ),
    );
  }
}

// ─── Player Tile ─────────────────────────────────────────────────────────────

final class _PlayerTile extends StatefulWidget {
  const _PlayerTile({
    required this.matchId,
    required this.userId,
    this.displayName,
    required this.joinedAt,
  });

  final String matchId;
  final String userId;
  final String? displayName;
  final DateTime joinedAt;

  @override
  State<_PlayerTile> createState() => _PlayerTileState();
}

final class _PlayerTileState extends State<_PlayerTile> {
  late final Future<bool> _isPaidFuture;

  @override
  void initState() {
    super.initState();
    _isPaidFuture = getIt<MonetizationRepository>()
        .listUserTransactions(userId: widget.userId, limit: 100)
        .then(
          (res) => res.transactions.any(
            (t) => t.matchId == widget.matchId && t.status == 'CONFIRMED',
          ),
        )
        .catchError((_) => false);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final name = widget.displayName ?? '';
    final initials = name.trim().isNotEmpty
        ? name.trim().split(RegExp(r'\s+')).take(2).map((w) => w[0]).join().toUpperCase()
        : '#';
    final avatarColor = _colorFromId(widget.userId, scheme);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.6)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: avatarColor.withValues(alpha: 0.18),
            child: Text(
              initials,
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 14,
                color: avatarColor,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
            Text(
              widget.displayName ?? 'Jugador #${idPreview(widget.userId)}',
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
            ),
                Text(
                  'Desde ${formatTimeHm(widget.joinedAt)}',
                  style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
          FutureBuilder<bool>(
            future: _isPaidFuture,
            builder: (context, snap) {
              if (snap.data == true) {
                return _SoftBadge(label: 'Pagado', emphasize: true);
              }
              if (snap.connectionState == ConnectionState.done) {
                return _SoftBadge(label: 'Pendiente');
              }
              return const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2));
            },
          ),
        ],
      ),
    );
  }

  Color _colorFromId(String id, ColorScheme scheme) {
    final hash = id.codeUnits.fold(0, (acc, c) => acc ^ c);
    final colors = [
      scheme.primary,
      scheme.secondary,
      scheme.tertiary,
      scheme.error,
    ];
    return colors[hash.abs() % colors.length];
  }
}

// ─── Empty Slot ──────────────────────────────────────────────────────────────

final class _EmptySlot extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return CustomPaint(
      painter: _DashedBorderPainter(
        color: scheme.primary.withValues(alpha: 0.35),
        radius: 16,
      ),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: scheme.primaryContainer.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: scheme.surfaceContainerHighest,
              child: Icon(Icons.add, color: scheme.onSurfaceVariant, size: 20),
            ),
            const SizedBox(width: 12),
            Text(
              'Lugar disponible',
              style: TextStyle(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DashedBorderPainter extends CustomPainter {
  const _DashedBorderPainter({required this.color, required this.radius});

  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    const dashLen = 6.0;
    const gapLen = 4.0;
    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Radius.circular(radius),
    );
    final path = Path()..addRRect(rrect);
    final metrics = path.computeMetrics();
    for (final metric in metrics) {
      double dist = 0;
      while (dist < metric.length) {
        canvas.drawPath(
          metric.extractPath(dist, math.min(dist + dashLen, metric.length)),
          paint,
        );
        dist += dashLen + gapLen;
      }
    }
  }

  @override
  bool shouldRepaint(_DashedBorderPainter old) => old.color != color;
}

// ─── Bottom Bar ──────────────────────────────────────────────────────────────

final class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.loaded,
    required this.canJoin,
    required this.isParticipant,
    required this.isFinished,
    required this.hasPrice,
  });

  final MatchDetailLoaded loaded;
  final bool canJoin;
  final bool isParticipant;
  final bool isFinished;
  final bool hasPrice;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final m = loaded.match;

    VoidCallback? primaryAction;
    String primaryLabel;
    Color? primaryBg;

    if (isFinished) {
      primaryLabel = 'Cargar resultado';
      primaryAction = () => context.push(Routes.matchResult(m.id));
    } else if (isParticipant && hasPrice) {
      primaryLabel = 'Pagar ahora';
      primaryAction = () => context.push(
            PayMethodScreen.route(
              matchId: m.id,
              amountPerPersonCents: m.pricePerPlayerCents,
              matchTitle: m.clubName ?? 'Partida',
            ),
          );
    } else if (isParticipant) {
      primaryLabel = 'Salir de la partida';
      primaryBg = scheme.errorContainer;
      primaryAction = () => _confirmLeave(context);
    } else if (canJoin) {
      primaryLabel = 'Unirme a la partida';
      primaryAction = () => context.read<MatchDetailCubit>().join();
    } else {
      primaryLabel = 'Partida llena';
    }

    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        decoration: BoxDecoration(
          color: scheme.surface,
          boxShadow: [
            BoxShadow(
              color: scheme.shadow.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, -4),
            ),
          ],
          border: Border(
            top: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.5)),
          ),
        ),
        child: Row(
          children: [
            // Chat icon button
            OutlinedButton(
              onPressed: loaded.actionLoading
                  ? null
                  : () => context.push(Routes.matchChat(m.id)),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(56, 56),
                padding: EdgeInsets.zero,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Icon(Icons.chat_bubble_outline, size: 22),
            ),
            const SizedBox(width: 12),
            // Main CTA
            Expanded(
              child: SizedBox(
                height: 56,
                child: FilledButton(
                  style: primaryBg != null
                      ? FilledButton.styleFrom(backgroundColor: primaryBg)
                      : null,
                  onPressed: loaded.actionLoading ? null : primaryAction,
                  child: loaded.actionLoading
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(
                          primaryLabel,
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmLeave(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Salir de la partida'),
        content: const Text('¿Confirmas que deseas salir de esta partida?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Volver'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(ctx).colorScheme.error,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Salir'),
          ),
        ],
      ),
    );
    if (ok == true && context.mounted) {
      context.read<MatchDetailCubit>().leave();
    }
  }
}

// ─── Sheet Action ────────────────────────────────────────────────────────────

final class _SheetAction extends StatelessWidget {
  const _SheetAction({
    required this.icon,
    required this.label,
    required this.onTap,
    this.isDestructive = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isDestructive;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = isDestructive ? scheme.error : scheme.onSurface;
    return ListTile(
      leading: Icon(icon, color: color),
      title: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600)),
      onTap: onTap,
    );
  }
}

// ─── Empty State ─────────────────────────────────────────────────────────────

final class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.action,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget action;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: scheme.onSurfaceVariant.withValues(alpha: 0.4)),
            const SizedBox(height: 16),
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: TextStyle(color: scheme.onSurfaceVariant),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            action,
          ],
        ),
      ),
    );
  }
}

// ─── Status Badge ────────────────────────────────────────────────────────────

final class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (bg, fg, label) = switch (status) {
      'SCHEDULED' => (scheme.primary, scheme.onPrimary, 'Programado'),
      'IN_PROGRESS' => (scheme.tertiary, scheme.onTertiary, 'En curso'),
      'FINISHED' => (scheme.onSurface, scheme.surface, 'Finalizado'),
      'CANCELLED' => (scheme.error, scheme.onError, 'Cancelado'),
      _ => (scheme.surfaceContainerHighest, scheme.onSurfaceVariant, status),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11, color: fg),
      ),
    );
  }
}

// ─── Soft Badge ──────────────────────────────────────────────────────────────

final class _SoftBadge extends StatelessWidget {
  const _SoftBadge({required this.label, this.emphasize = false});

  final String label;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bg = emphasize
        ? scheme.primary.withValues(alpha: 0.12)
        : scheme.surfaceContainerHighest;
    final fg = emphasize ? scheme.primary : scheme.onSurfaceVariant;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11, color: fg),
      ),
    );
  }
}

// ─── Info Tile ───────────────────────────────────────────────────────────────

final class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
    this.highlight = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: highlight ? scheme.primary : scheme.onSurfaceVariant),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                  color: highlight ? scheme.primary : scheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 14,
              color: highlight ? scheme.primary : scheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}
