import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/brand_colors.dart';

/// Pila de avatares solapados (cupos de una partida), recreando el prototipo:
/// los lugares ocupados son **puntos sólidos multicolor** (paleta que cicla por
/// índice) y los libres son círculos **punteados**. No muestra iniciales.
///
/// Es **presentacional**: recibe cuántos cupos están ocupados ([filledCount]) y
/// cuántos quedan libres ([emptySpots]).
class AvatarStack extends StatelessWidget {
  const AvatarStack({
    super.key,
    required this.filledCount,
    this.emptySpots = 0,
    this.size = 24,
  });

  /// Número de cupos ocupados (puntos sólidos de color).
  final int filledCount;

  /// Número de cupos libres (círculos punteados).
  final int emptySpots;

  /// Diámetro de cada círculo.
  final double size;

  @override
  Widget build(BuildContext context) {
    final filled = math.max(0, filledCount);
    final empty = math.max(0, emptySpots);
    final total = filled + empty;
    if (total == 0) return const SizedBox.shrink();

    final overlap = size * 0.34;
    final step = size - overlap;
    final totalWidth = size + (total - 1) * step;

    final tiles = <Widget>[
      for (var i = 0; i < filled; i++)
        _Dot(size: size, color: BrandColors.avatarPalette[i % BrandColors.avatarPalette.length]),
      for (var i = 0; i < empty; i++) _Dot(size: size, color: null),
    ];

    return SizedBox(
      width: totalWidth,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          for (var i = 0; i < tiles.length; i++)
            Positioned(left: i * step, child: tiles[i]),
        ],
      ),
    );
  }
}

/// Punto de la pila: relleno sólido si [color] != null, punteado si es null.
class _Dot extends StatelessWidget {
  const _Dot({required this.size, required this.color});

  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (color != null) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: scheme.surfaceContainer, width: 2),
        ),
      );
    }
    // Cupo libre: círculo punteado sobre surface-2.
    return CustomPaint(
      size: Size.square(size),
      painter: _DashedCirclePainter(
        ring: scheme.outline,
        fill: scheme.surfaceContainerHighest,
        gap: scheme.surfaceContainer,
      ),
    );
  }
}

class _DashedCirclePainter extends CustomPainter {
  _DashedCirclePainter({required this.ring, required this.fill, required this.gap});

  final Color ring;
  final Color fill;
  final Color gap;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    // Borde de 2px del color del fondo de la card (efecto de solapado).
    canvas.drawCircle(center, size.width / 2, Paint()..color = gap);
    final r = size.width / 2 - 2;
    canvas.drawCircle(center, r, Paint()..color = fill);
    final ringPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..color = ring;
    const dash = 3.2;
    final circumference = 2 * math.pi * r;
    final dashCount = (circumference / (dash * 2)).floor();
    final sweep = (2 * math.pi) / dashCount;
    for (var i = 0; i < dashCount; i++) {
      final start = i * sweep;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: r),
        start,
        sweep / 2,
        false,
        ringPaint,
      );
    }
  }

  @override
  bool shouldRepaint(_DashedCirclePainter old) =>
      old.ring != ring || old.fill != fill || old.gap != gap;
}
