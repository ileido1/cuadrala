import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/brand_colors.dart';

/// Mitad de cancha (equipo).
enum CourtTeam { a, b }

/// Carril dentro de un equipo.
enum CourtLane { drive, reves }

/// Estado de pago de un jugador colocado en la cancha.
enum CourtPlayerStatus { paid, pending }

/// Jugador colocado en una posición de la cancha.
@immutable
class CourtPlayer {
  const CourtPlayer({
    required this.name,
    required this.colorIndex,
    this.status = CourtPlayerStatus.pending,
    this.isYou = false,
  });

  /// Nombre completo; en el spot se muestra solo el primer nombre.
  final String name;

  /// Índice en [BrandColors.avatarPalette] (cicla por jugador).
  final int colorIndex;

  /// Pagado (verde) o pendiente (lime).
  final CourtPlayerStatus status;

  /// Marca al jugador como "TÚ".
  final bool isYou;
}

/// Una de las 4 posiciones: ocupada ([player] != null) o vacía.
///
/// Si está vacía y [joinable] es `true`, se renderiza como "Unirme aquí"
/// (interactiva); si no, como "Disponible" (solo lectura).
@immutable
class CourtSpotData {
  const CourtSpotData({this.player, this.joinable = false});

  final CourtPlayer? player;
  final bool joinable;
}

/// Vista de cancha unificada (Equipo A verde · RED · Equipo B lime), recreando
/// `cuadrala-court.jsx`. Se reutiliza en detalle (unirse), cargar resultado
/// (asignar posiciones) y detalle finalizado (solo lectura con marcador).
///
/// Es **presentacional**: el llamador arma las 4 posiciones y decide cuáles
/// son [CourtSpotData.joinable] según la fase. [onJoin] se dispara al tocar un
/// spot vacío unible.
class CourtView extends StatelessWidget {
  const CourtView({
    super.key,
    required this.teamADrive,
    required this.teamAReves,
    required this.teamBDrive,
    required this.teamBReves,
    this.scoreA,
    this.scoreB,
    this.onJoin,
  });

  final CourtSpotData teamADrive;
  final CourtSpotData teamAReves;
  final CourtSpotData teamBDrive;
  final CourtSpotData teamBReves;

  /// Marcador por equipo (solo en modo finalizado). `null` lo oculta.
  final String? scoreA;
  final String? scoreB;

  /// Se llama con (equipo, carril) al tocar un spot vacío unible.
  final void Function(CourtTeam team, CourtLane lane)? onJoin;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: Column(
        children: [
          _TeamRow(
            team: CourtTeam.a,
            accent: scheme.primary,
            labelColor: scheme.primary,
            score: scoreA,
            drive: teamADrive,
            reves: teamAReves,
            onJoin: onJoin,
          ),
          const _NetDivider(),
          _TeamRow(
            team: CourtTeam.b,
            accent: scheme.tertiary,
            labelColor: scheme.tertiary,
            score: scoreB,
            drive: teamBDrive,
            reves: teamBReves,
            onJoin: onJoin,
          ),
        ],
      ),
    );
  }
}

class _TeamRow extends StatelessWidget {
  const _TeamRow({
    required this.team,
    required this.accent,
    required this.labelColor,
    required this.score,
    required this.drive,
    required this.reves,
    required this.onJoin,
  });

  final CourtTeam team;
  final Color accent;
  final Color labelColor;
  final String? score;
  final CourtSpotData drive;
  final CourtSpotData reves;
  final void Function(CourtTeam team, CourtLane lane)? onJoin;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final teamLabel = team == CourtTeam.a ? 'Equipo A' : 'Equipo B';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              teamLabel,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.4,
                color: labelColor,
              ),
            ),
            if (score != null)
              Text(
                score!,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w800,
                  color: scheme.onSurface,
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _Spot(
                data: drive,
                accent: accent,
                onJoin: () => onJoin?.call(team, CourtLane.drive),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _Spot(
                data: reves,
                accent: accent,
                onJoin: () => onJoin?.call(team, CourtLane.reves),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _Spot extends StatelessWidget {
  const _Spot({required this.data, required this.accent, required this.onJoin});

  final CourtSpotData data;
  final Color accent;
  final VoidCallback onJoin;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final player = data.player;

    // ── Ocupada ──────────────────────────────────────────────────────────
    if (player != null) {
      final paid = player.status == CourtPlayerStatus.paid;
      final statusColor = paid ? scheme.primary : scheme.tertiary;
      final borderColor = player.isYou ? scheme.tertiary : accent;

      return Container(
        height: 104,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: borderColor, width: 2),
        ),
        child: Stack(
          children: [
            if (player.isYou)
              Positioned(
                top: -3,
                right: -1,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(
                    color: scheme.tertiary,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text(
                    'TÚ',
                    style: TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                      color: BrandColors.onLime,
                    ),
                  ),
                ),
              ),
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _Avatar(name: player.name, colorIndex: player.colorIndex),
                  const SizedBox(height: 6),
                  Text(
                    _firstName(player.name),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: scheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: statusColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        paid ? 'Pagado' : 'Pendiente',
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                          color: statusColor,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // ── Vacía: unible o solo lectura ──────────────────────────────────────
    final joinable = data.joinable;
    final lineStrong = scheme.onSurface.withValues(alpha: 0.18);
    final outline = joinable ? accent : lineStrong;
    final iconColor = joinable ? accent : scheme.onSurfaceVariant;
    final labelColor = joinable ? scheme.onSurface : scheme.onSurfaceVariant;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: joinable ? onJoin : null,
      child: CustomPaint(
        painter: _DashedRRectPainter(
          color: outline,
          radius: 14,
          strokeWidth: 2,
        ),
        child: Container(
          height: 104,
          decoration: BoxDecoration(
            color: joinable
                ? scheme.surface.withValues(alpha: 0.5)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CustomPaint(
                painter: _DashedCirclePainter(color: outline, strokeWidth: 1.5),
                child: SizedBox(
                  width: 36,
                  height: 36,
                  child: Icon(
                    joinable ? Icons.add_rounded : Icons.group_outlined,
                    size: 18,
                    color: iconColor,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                joinable ? 'Unirme aquí' : 'Disponible',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: labelColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.name, required this.colorIndex});

  final String name;
  final int colorIndex;

  @override
  Widget build(BuildContext context) {
    final color = BrandColors
        .avatarPalette[colorIndex % BrandColors.avatarPalette.length];
    return Container(
      width: 40,
      height: 40,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      child: Text(
        _initials(name),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _NetDivider extends StatelessWidget {
  const _NetDivider();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final line = scheme.onSurface.withValues(alpha: 0.18);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Row(
        children: [
          Expanded(child: _DashedHLine(color: line)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Text(
              'RED',
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.5,
                color: scheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(child: _DashedHLine(color: line)),
        ],
      ),
    );
  }
}

// ── Helpers de texto ─────────────────────────────────────────────────────────

String _firstName(String name) {
  final trimmed = name.trim();
  if (trimmed.isEmpty) return '';
  return trimmed.split(RegExp(r'\s+')).first;
}

String _initials(String name) {
  final parts =
      name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  if (parts.length == 1) return parts.first.characters.first.toUpperCase();
  return (parts.first.characters.first + parts.last.characters.first)
      .toUpperCase();
}

// ── Painters ─────────────────────────────────────────────────────────────────

class _DashedHLine extends StatelessWidget {
  const _DashedHLine({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(double.infinity, 2),
      painter: _DashedHLinePainter(color: color),
    );
  }
}

class _DashedHLinePainter extends CustomPainter {
  _DashedHLinePainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    const dash = 6.0;
    const gap = 6.0;
    var x = 0.0;
    final y = size.height / 2;
    while (x < size.width) {
      canvas.drawLine(Offset(x, y), Offset(math.min(x + dash, size.width), y), paint);
      x += dash + gap;
    }
  }

  @override
  bool shouldRepaint(_DashedHLinePainter old) => old.color != color;
}

class _DashedRRectPainter extends CustomPainter {
  _DashedRRectPainter({
    required this.color,
    required this.radius,
    required this.strokeWidth,
  });

  final Color color;
  final double radius;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;
    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Radius.circular(radius),
    );
    final path = Path()..addRRect(rrect);
    for (final metric in path.computeMetrics()) {
      var dist = 0.0;
      while (dist < metric.length) {
        canvas.drawPath(
          metric.extractPath(dist, math.min(dist + 6, metric.length)),
          paint,
        );
        dist += 10;
      }
    }
  }

  @override
  bool shouldRepaint(_DashedRRectPainter old) =>
      old.color != color || old.radius != radius;
}

class _DashedCirclePainter extends CustomPainter {
  _DashedCirclePainter({required this.color, required this.strokeWidth});

  final Color color;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final r = size.width / 2 - strokeWidth / 2;
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;
    final circumference = 2 * math.pi * r;
    final dashCount = (circumference / 7).floor().clamp(6, 100);
    final sweep = (2 * math.pi) / dashCount;
    for (var i = 0; i < dashCount; i++) {
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: r),
        i * sweep,
        sweep / 2,
        false,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_DashedCirclePainter old) =>
      old.color != color || old.strokeWidth != strokeWidth;
}
