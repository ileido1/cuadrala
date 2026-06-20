import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

// ignore_for_file: use_build_context_synchronously

import '../../../core/di/service_locator.dart';
import '../../../core/formatting/id_preview.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/formatting/scheduled_label.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/brand_colors.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/court_view.dart';
import '../../../shared/widgets/info_badge.dart';
import '../data/matches_repository.dart';
import '../data/models/match_detail_dto.dart';
import '../../monetization/data/monetization_repository.dart';
import '../../monetization/presentation/pay_method_screen.dart';
import '../../profile/data/profile_repository.dart';
import 'cubit/match_detail_cubit.dart';
import 'cubit/match_detail_state.dart';
import 'open_match_display.dart';

// ─── Fases del detalle (handoff) ──────────────────────────────────────────────

enum _Phase { browse, joined, pending, confirmed, played }

_Phase _phaseFor(MatchDetailLoaded l) {
  final m = l.match;
  if (m.status == 'FINISHED') return _Phase.played;
  if (!l.isParticipant) return _Phase.browse;
  final hasPrice = m.pricePerPlayerCents > 0;
  if (!hasPrice || l.viewerHasConfirmedPayment) return _Phase.confirmed;
  if (l.viewerHasPendingPayment) return _Phase.pending;
  return _Phase.joined;
}

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
        monetizationRepository: getIt<MonetizationRepository>(),
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
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      key: const Key('match.detail'),
      backgroundColor: scheme.surfaceContainerLowest,
      appBar: AppBar(
        backgroundColor: scheme.surfaceContainerLow,
        surfaceTintColor: scheme.surfaceContainerLow,
        title: const Text(
          'Detalle de partida',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 19),
        ),
        leading: IconButton(
          icon: const Icon(AppIcons.arrowBack),
          onPressed: () => Routes.popOrGoPartidas(context),
        ),
        actions: const [_DetailActions(), SizedBox(width: 4)],
      ),
      body: BlocBuilder<MatchDetailCubit, MatchDetailState>(
        builder: (context, state) {
          if (state is MatchDetailLoading || state is MatchDetailInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is MatchDetailNotFound) {
            return _EmptyState(
              icon: AppIcons.racquetSport,
              title: 'Partida no encontrada',
              subtitle: 'Es posible que haya sido eliminada.',
              action: TextButton(
                onPressed: () => Routes.popOrGoPartidas(context),
                child: const Text('Volver'),
              ),
            );
          }
          if (state is MatchDetailFailure) {
            return _EmptyState(
              icon: AppIcons.wifiOff,
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
          final phase = _phaseFor(loaded);
          final usesCourt = m.maxParticipants == 4;

          return Column(
            children: [
              Expanded(
                child: Stack(
                  children: [
                    ListView(
                      padding: const EdgeInsets.fromLTRB(20, 18, 20, 150),
                      children: [
                        _StatusRow(status: m.status),
                        const SizedBox(height: 12),
                        Text(
                          m.clubName ?? 'Partida sin sede',
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                            height: 1.1,
                          ),
                        ),
                        const SizedBox(height: 6),
                        _LocationRow(match: m),
                        _Banner(phase: phase),
                        const SizedBox(height: 14),
                        _InfoTilesRow(match: m),
                        const SizedBox(height: 12),
                        _DetailChips(match: m),
                        const SizedBox(height: 24),
                        _CourtHeader(
                          finished: phase == _Phase.played,
                          filled: m.participantCount,
                          total: m.maxParticipants,
                        ),
                        const SizedBox(height: 12),
                        if (usesCourt)
                          _CourtSection(loaded: loaded, phase: phase)
                        else
                          _PlayersFallback(match: m),
                      ],
                    ),
                    Positioned(
                      right: 0,
                      bottom: 16,
                      child: _ChatFab(matchId: m.id),
                    ),
                  ],
                ),
              ),
              if (loaded.actionMessage != null)
                _ActionMessageBanner(
                  message: loaded.actionMessage!,
                  isError: loaded.actionMessageIsError,
                ),
              _Footer(loaded: loaded, phase: phase, usesCourt: usesCourt),
            ],
          );
        },
      ),
    );
  }
}

// ─── Header actions (share + overflow) ────────────────────────────────────────

final class _DetailActions extends StatelessWidget {
  const _DetailActions();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<MatchDetailCubit, MatchDetailState>(
      builder: (context, state) {
        if (state is! MatchDetailLoaded) return const SizedBox.shrink();
        final m = state.match;
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(AppIcons.share, size: 20),
              tooltip: 'Compartir',
              onPressed: () => _shareMatchInvite(context, m),
            ),
            IconButton(
              icon: const Icon(AppIcons.moreHoriz),
              tooltip: 'Acciones',
              onPressed: () => _showActionsSheet(context, state),
            ),
          ],
        );
      },
    );
  }
}

// ─── Status + category chips ──────────────────────────────────────────────────

final class _StatusRow extends StatelessWidget {
  const _StatusRow({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<MatchDetailCubit, MatchDetailState>(
      builder: (context, state) {
        final m = state is MatchDetailLoaded ? state.match : null;
        return Row(
          children: [
            _statusBadge(context, status),
            if (m?.categoryName != null) ...[
              const SizedBox(width: 8),
              InfoBadge(
                label: m!.categoryName!,
                background: BrandColors.limeAccent,
                foreground: BrandColors.onLime,
              ),
            ],
          ],
        );
      },
    );
  }
}

Widget _statusBadge(BuildContext context, String status) {
  final scheme = Theme.of(context).colorScheme;
  final (label, color) = switch (status) {
    'SCHEDULED' => ('Programado', scheme.primary),
    'IN_PROGRESS' => ('En curso', scheme.primary),
    'FINISHED' => ('Finalizada', scheme.primary),
    'CANCELLED' => ('Cancelada', scheme.error),
    _ => (status, scheme.onSurfaceVariant),
  };
  return InfoBadge(label: label, color: color, dot: true);
}

final class _LocationRow extends StatelessWidget {
  const _LocationRow({required this.match});

  final MatchDetailDto match;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = [
      if (match.courtName != null) match.courtName!,
      if (match.locationLabel != null) match.locationLabel!,
    ].join(' · ');
    if (text.isEmpty) return const SizedBox.shrink();
    return Row(
      children: [
        Icon(AppIcons.pin, size: 15, color: scheme.onSurfaceVariant),
        const SizedBox(width: 5),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 13.5, color: scheme.onSurfaceVariant),
          ),
        ),
      ],
    );
  }
}

// ─── Phase banner ─────────────────────────────────────────────────────────────

final class _Banner extends StatelessWidget {
  const _Banner({required this.phase});

  final _Phase phase;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (icon, accent, title, sub) = switch (phase) {
      _Phase.browse => (
        AppIcons.group,
        scheme.onSurfaceVariant,
        'Únete a esta partida',
        'Elige tu lugar en la cancha 👇',
      ),
      _Phase.joined => (
        AppIcons.check,
        scheme.primary,
        'Te uniste a la partida',
        'Falta confirmar tu pago',
      ),
      _Phase.pending => (
        AppIcons.clock,
        scheme.tertiary,
        'Pago en revisión',
        'El staff de la sede confirmará tu pago',
      ),
      _Phase.confirmed => (
        AppIcons.check,
        scheme.primary,
        'Ya estás anotado',
        'Tu pago está confirmado',
      ),
      _Phase.played => (
        AppIcons.target,
        scheme.primary,
        'Partida finalizada',
        'Resultado y ELO actualizados',
      ),
    };
    final neutral = phase == _Phase.browse;
    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: neutral
            ? scheme.surfaceContainer
            : accent.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: neutral
              ? scheme.outlineVariant
              : accent.withValues(alpha: 0.35),
          width: 1.5,
        ),
      ),
      child: Row(
        children: [
          Icon(icon, size: 22, color: accent),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                    color: scheme.onSurface,
                  ),
                ),
                Text(
                  sub,
                  style: TextStyle(
                    fontSize: 12.5,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Info tiles (fecha + precio) ──────────────────────────────────────────────

final class _InfoTilesRow extends StatelessWidget {
  const _InfoTilesRow({required this.match});

  final MatchDetailDto match;

  @override
  Widget build(BuildContext context) {
    final m = match;
    final scheduled = m.scheduledAt;
    final hasPrice = m.pricePerPlayerCents > 0;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: _InfoTile(
              icon: AppIcons.calendar,
              label: 'Fecha',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    scheduled == null
                        ? 'Por confirmar'
                        : '${shortDateLabel(scheduled)} ${compactCalendarDate(scheduled)}',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    scheduled == null ? '—' : '${formatTimeHm(scheduled)} hs',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _InfoTile(
              icon: AppIcons.info,
              label: 'Precio',
              child: hasPrice
                  ? Text(
                      '${formatMoneyLabel(m.pricePerPlayerCents, matchDetailDisplayCurrency(m))} p/p',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    )
                  : const Text(
                      'Gratis',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

final class _InfoTile extends StatelessWidget {
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.child,
  });

  final IconData icon;
  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: scheme.surfaceContainer,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 15, color: scheme.onSurfaceVariant),
              const SizedBox(width: 6),
              Text(
                label.toUpperCase(),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.4,
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          child,
        ],
      ),
    );
  }
}

final class _DetailChips extends StatelessWidget {
  const _DetailChips({required this.match});

  final MatchDetailDto match;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _DetailChip(
          icon: AppIcons.target,
          iconColor: Theme.of(context).colorScheme.primary,
          label: match.affectsElo ? 'Ranked · Afecta ELO' : 'Amistoso',
        ),
      ],
    );
  }
}

final class _DetailChip extends StatelessWidget {
  const _DetailChip({required this.icon, required this.label, this.iconColor});

  final IconData icon;
  final String label;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: scheme.surfaceContainer,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: iconColor ?? scheme.onSurfaceVariant),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: scheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}

final class _CourtHeader extends StatelessWidget {
  const _CourtHeader({
    required this.finished,
    required this.filled,
    required this.total,
  });

  final bool finished;
  final int filled;
  final int total;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        Expanded(
          child: Text(
            finished ? 'Resultado' : 'En la cancha',
            style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
          decoration: BoxDecoration(
            color: scheme.primary.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            '$filled/$total',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: scheme.primary,
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Court section — derives positions from join order (padel 4) ──────────────

final class _CourtSection extends StatelessWidget {
  const _CourtSection({required this.loaded, required this.phase});

  final MatchDetailLoaded loaded;
  final _Phase phase;

  @override
  Widget build(BuildContext context) {
    final m = loaded.match;
    final parts = m.participants;
    final canJoin = m.status == 'SCHEDULED' && m.openSpots > 0;
    final joinableEmpty = phase == _Phase.browse && canJoin;

    CourtSpotData spot(int index) {
      if (index < parts.length) {
        final p = parts[index];
        final isYou = p.userId == loaded.viewerUserId;
        final status = isYou
            ? (loaded.viewerHasConfirmedPayment
                  ? CourtPlayerStatus.paid
                  : CourtPlayerStatus.pending)
            : CourtPlayerStatus.paid;
        return CourtSpotData(
          player: CourtPlayer(
            name: p.displayName ?? 'Jugador #${idPreview(p.userId)}',
            colorIndex: index,
            status: status,
            isYou: isYou,
          ),
        );
      }
      return CourtSpotData(joinable: joinableEmpty);
    }

    return CourtView(
      teamADrive: spot(0),
      teamAReves: spot(1),
      teamBDrive: spot(2),
      teamBReves: spot(3),
      onJoin: joinableEmpty
          ? (_, _) => context.read<MatchDetailCubit>().join()
          : null,
    );
  }
}

// ─── Players fallback list (no padel-4) ──────────────────────────────────────

final class _PlayersFallback extends StatelessWidget {
  const _PlayersFallback({required this.match});

  final MatchDetailDto match;

  @override
  Widget build(BuildContext context) {
    final m = match;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
          const Padding(
            padding: EdgeInsets.only(bottom: 10),
            child: _EmptySlot(),
          ),
      ],
    );
  }
}

// ─── Player Tile (fallback) ───────────────────────────────────────────────────

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
        ? name
              .trim()
              .split(RegExp(r'\s+'))
              .take(2)
              .map((w) => w[0])
              .join()
              .toUpperCase()
        : '#';
    final avatarColor = _colorFromId(widget.userId, scheme);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.surfaceContainer,
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
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
                Text(
                  'Desde ${formatTimeHm(widget.joinedAt)}',
                  style: TextStyle(
                    fontSize: 12,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          FutureBuilder<bool>(
            future: _isPaidFuture,
            builder: (context, snap) {
              if (snap.data == true) {
                return InfoBadge(
                  label: 'Pagado',
                  color: scheme.primary,
                  fontSize: 11,
                );
              }
              if (snap.connectionState == ConnectionState.done) {
                return InfoBadge(
                  label: 'Pendiente',
                  background: scheme.surfaceContainerHighest,
                  foreground: scheme.onSurfaceVariant,
                  fontSize: 11,
                );
              }
              return const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              );
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

final class _EmptySlot extends StatelessWidget {
  const _EmptySlot();

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
          color: scheme.primary.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: scheme.surfaceContainerHighest,
              child: Icon(AppIcons.add, color: scheme.onSurfaceVariant, size: 20),
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
    for (final metric in path.computeMetrics()) {
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

// ─── Chat FAB ─────────────────────────────────────────────────────────────────

final class _ChatFab extends StatelessWidget {
  const _ChatFab({required this.matchId});

  final String matchId;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surfaceContainer,
      borderRadius: BorderRadius.circular(16),
      elevation: 6,
      shadowColor: Colors.black.withValues(alpha: 0.3),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push(Routes.matchChat(matchId)),
        child: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: scheme.outlineVariant, width: 1.5),
          ),
          child: Icon(
            AppIcons.chat,
            size: 22,
            color: scheme.onSurface,
          ),
        ),
      ),
    );
  }
}

// ─── Phase footer ─────────────────────────────────────────────────────────────

final class _Footer extends StatelessWidget {
  const _Footer({
    required this.loaded,
    required this.phase,
    required this.usesCourt,
  });

  final MatchDetailLoaded loaded;
  final _Phase phase;
  final bool usesCourt;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final m = loaded.match;
    final priceLabel = formatMoneyLabel(
      m.pricePerPlayerCents,
      matchDetailDisplayCurrency(m),
    );

    return Container(
      padding: EdgeInsets.fromLTRB(
        20,
        14,
        20,
        MediaQuery.of(context).padding.bottom + 16,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            scheme.surfaceContainerLow.withValues(alpha: 0),
            scheme.surfaceContainerLow,
          ],
        ),
        border: Border(top: BorderSide(color: scheme.outlineVariant)),
      ),
      child: loaded.actionLoading
          ? const SizedBox(
              height: 54,
              child: Center(child: CircularProgressIndicator()),
            )
          : _content(context, scheme, m, priceLabel),
    );
  }

  Widget _content(
    BuildContext context,
    ColorScheme scheme,
    MatchDetailDto m,
    String priceLabel,
  ) {
    switch (phase) {
      case _Phase.browse:
        final canJoin = m.status == 'SCHEDULED' && m.openSpots > 0;
        if (!canJoin) {
          return _DisabledCta(
            icon: AppIcons.group,
            label: 'Partida llena',
          );
        }
        if (usesCourt) {
          return _DisabledCta(
            icon: AppIcons.group,
            label: 'Toca un lugar para unirte',
          );
        }
        return _PrimaryCta(
          icon: AppIcons.add,
          label: 'Unirme a la partida',
          onPressed: () => context.read<MatchDetailCubit>().join(),
        );

      case _Phase.joined:
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Tu lugar reservado',
                    style: TextStyle(
                      fontSize: 13,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ),
                Text(
                  '$priceLabel p/p',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: scheme.onSurface,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _PrimaryCta(
              icon: AppIcons.info,
              label: 'Pagar ahora · $priceLabel',
              onPressed: () => context.push(
                PayMethodScreen.route(
                  matchId: m.id,
                  amountPerPersonCents: m.pricePerPlayerCents,
                  matchTitle: m.clubName ?? 'Partida',
                  venueId: m.venueId,
                  pricingCurrency: m.pricingCurrency,
                  displayCurrency: m.displayCurrency,
                  scheduledAt: m.scheduledAt,
                ),
              ),
            ),
          ],
        );

      case _Phase.pending:
      case _Phase.confirmed:
        return Row(
          children: [
            _SquareButton(
              icon: AppIcons.share,
              onTap: () => _shareMatchInvite(context, m),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _PrimaryCta(
                icon: AppIcons.chat,
                label: 'Compartir partida',
                onPressed: () => _shareMatchInvite(context, m),
              ),
            ),
          ],
        );

      case _Phase.played:
        return Row(
          children: [
            _SquareButton(
              icon: AppIcons.share,
              onTap: () => _shareMatchInvite(context, m),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _PrimaryCta(
                icon: AppIcons.target,
                label: 'Cargar resultado',
                onPressed: () => context.push(Routes.matchResult(m.id)),
              ),
            ),
          ],
        );
    }
  }
}

final class _PrimaryCta extends StatelessWidget {
  const _PrimaryCta({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: FilledButton.icon(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          elevation: 8,
          shadowColor: scheme.primary.withValues(alpha: 0.4),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        icon: Icon(icon, size: 20),
        label: Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
        ),
      ),
    );
  }
}

final class _DisabledCta extends StatelessWidget {
  const _DisabledCta({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      height: 54,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 20, color: scheme.onSurfaceVariant),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: scheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

final class _SquareButton extends StatelessWidget {
  const _SquareButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          width: 54,
          height: 54,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: scheme.outlineVariant, width: 1.5),
          ),
          child: Icon(icon, size: 22, color: scheme.onSurface),
        ),
      ),
    );
  }
}

// ─── Action feedback ─────────────────────────────────────────────────────────

final class _ActionMessageBanner extends StatelessWidget {
  const _ActionMessageBanner({required this.message, required this.isError});

  final String message;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bg = isError
        ? scheme.errorContainer
        : scheme.primary.withValues(alpha: 0.15);
    final fg = isError ? scheme.error : scheme.primary;
    final icon = isError ? AppIcons.warning : AppIcons.checkCircle;

    return Material(
      color: bg,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: fg),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: TextStyle(color: fg, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
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
            Icon(
              icon,
              size: 56,
              color: scheme.onSurfaceVariant.withValues(alpha: 0.4),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
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

// ─── Organizer / participant actions sheet ────────────────────────────────────

void _showActionsSheet(BuildContext context, MatchDetailLoaded loaded) {
  final cubit = context.read<MatchDetailCubit>();
  final m = loaded.match;
  final isOrganizer =
      m.participants.isNotEmpty &&
      m.participants.first.userId == loaded.viewerUserId;
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
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Gestionar partida',
                  style: Theme.of(ctx).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
            _SheetAction(
              icon: AppIcons.chat,
              label: 'Abrir chat',
              onTap: () {
                Navigator.pop(ctx);
                context.push(Routes.matchChat(m.id));
              },
            ),
            if (isOrganizer && m.status == 'SCHEDULED')
              _SheetAction(
                icon: AppIcons.playCircle,
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
            if (isOrganizer && m.status == 'IN_PROGRESS')
              _SheetAction(
                icon: AppIcons.stopCircle,
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
            if (isOrganizer && isFinished)
              _SheetAction(
                icon: AppIcons.scoreboard,
                label: 'Cargar resultado',
                onTap: () {
                  Navigator.pop(ctx);
                  context.push(Routes.matchResult(m.id));
                },
              ),
            if (!isOrganizer && loaded.isParticipant && !isFinished)
              _SheetAction(
                icon: AppIcons.signOut,
                label: 'Salir de la partida',
                isDestructive: true,
                onTap: () {
                  Navigator.pop(ctx);
                  _confirmLeave(context);
                },
              ),
            if (isOrganizer && m.status != 'CANCELLED' && !isFinished)
              _SheetAction(
                icon: AppIcons.closeCircle,
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

void _confirmLeave(BuildContext context) async {
  final cubit = context.read<MatchDetailCubit>();
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
    cubit.leave();
  }
}

void _shareMatchInvite(BuildContext context, MatchDetailDto match) {
  final scheduled = match.scheduledAt;
  final when = scheduled == null
      ? 'Fecha por confirmar'
      : '${shortDateLabel(scheduled)}, ${formatTimeHm(scheduled)} hs';
  final whereParts = <String>[
    if (match.clubName != null && match.clubName!.trim().isNotEmpty)
      match.clubName!.trim(),
    if (match.courtName != null && match.courtName!.trim().isNotEmpty)
      match.courtName!.trim(),
    if (match.locationLabel != null && match.locationLabel!.trim().isNotEmpty)
      match.locationLabel!.trim(),
  ];
  final where = whereParts.isEmpty ? '' : ' en ${whereParts.join(' · ')}';
  final spotsLine = match.openSpots > 0
      ? '\nQuedan ${match.openSpots} lugares.'
      : '';

  final text = StringBuffer()
    ..writeln('¡Sumate a mi partida de pádel$where!')
    ..writeln(when)
    ..write(spotsLine)
    ..writeln()
    ..writeln('Buscá la partida en Cuadrala.');

  Clipboard.setData(ClipboardData(text: text.toString().trim()));
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(
      content: Text('Invitación copiada. Pegala en WhatsApp o donde quieras.'),
    ),
  );
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
      title: Text(
        label,
        style: TextStyle(color: color, fontWeight: FontWeight.w600),
      ),
      onTap: onTap,
    );
  }
}
