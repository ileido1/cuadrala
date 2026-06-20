import 'package:flutter/material.dart';

import '../../core/theme/brand_colors.dart';

/// Marca "C" de Cuádrala — 4 arcos verde/navy + línea de cancha central.
///
/// Réplica 1:1 del SVG del prototipo (`cuadrala-auth.jsx` → `Logo`,
/// viewBox 0 0 48 48). Vectorial a propósito: nada de PNG, escala nítida
/// a cualquier tamaño/densidad sin agregar una dependencia de SVG.
class CuadralaMark extends StatelessWidget {
  const CuadralaMark({super.key, this.size = 24});

  final double size;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size.square(size),
      painter: _CuadralaMarkPainter(),
    );
  }
}

class _CuadralaMarkPainter extends CustomPainter {
  static const _green = BrandColors.padelGreen;
  static const _navy = BrandColors.navy;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 48;
    Offset p(double x, double y) => Offset(x * scale, y * scale);
    Paint stroke(Color color, double width) => Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = width * scale
      ..strokeCap = StrokeCap.round
      ..color = color;

    final arcs = <(Offset, Offset, Color)>[
      (p(38, 13), p(24, 7), _green),
      (p(24, 7), p(5.4, 19), _navy),
      (p(5.4, 29), p(24, 41), _green),
      (p(24, 41), p(38, 35), _navy),
    ];
    final radius = Radius.circular(19 * scale);
    for (final (start, end, color) in arcs) {
      final path = Path()
        ..moveTo(start.dx, start.dy)
        ..arcToPoint(end, radius: radius, clockwise: false);
      canvas.drawPath(path, stroke(color, 5.5));
    }

    final centerLine = Path()
      ..moveTo(p(16, 24).dx, p(16, 24).dy)
      ..lineTo(p(29, 24).dx, p(29, 24).dy);
    canvas.drawPath(centerLine, stroke(_green, 4.2));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
