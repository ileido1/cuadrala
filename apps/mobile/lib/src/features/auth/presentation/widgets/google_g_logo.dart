import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Renders the multicolour Google "G" mark using [CustomPaint].
/// Brand colours per Google identity guidelines:
///   Blue  #4285F4 · Red  #EA4335 · Yellow  #FBBC05 · Green  #34A853
class GoogleGLogo extends StatelessWidget {
  const GoogleGLogo({super.key, this.size = 20});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _GoogleGPainter(),
      ),
    );
  }
}

class _GoogleGPainter extends CustomPainter {
  // Google brand colours
  static const _blue = Color(0xFF4285F4);
  static const _red = Color(0xFFEA4335);
  static const _yellow = Color(0xFFFBBC05);
  static const _green = Color(0xFF34A853);

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final r = size.width / 2;

    // Stroke width proportional to the icon size
    final strokeWidth = size.width * 0.18;

    // Inner radius of the arc (the "ring" of the G)
    final innerR = r * 0.56;
    // Outer radius of the arc
    final outerR = r * 0.88;
    final arcR = (innerR + outerR) / 2;
    final arcStroke = outerR - innerR;

    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = arcStroke
      ..strokeCap = StrokeCap.butt;

    // ── Red arc: top-right going counter-clockwise through top (from ~350° to ~220°)
    //    In Flutter: angles are measured from the positive x-axis (3 o'clock) clockwise.
    //    Red covers the top-right quadrant and top, roughly 315°→60° (clockwise).
    //    We use standard math angles converted to Flutter's coordinate system.
    //
    //    Google G arc breakdown (clockwise from top, 12 o'clock = -π/2):
    //      Red:    -π/2 → π/6   (from 12 o'clock to 2 o'clock, ~240° sweep — actually it's smaller)
    //
    //    Accurate breakdown (angles from positive x-axis, clockwise = positive in Flutter):
    //      Red:    -π/2 to π/3    sweep: 5π/6   (~150°) — top, sweeping right and down to ~4 o'clock
    //      Yellow: π/3  to π/2    sweep: π/6    (~30°)  — bottom-right, 4 o'clock to 6 o'clock
    //      Green:  π/2  to 5π/6   sweep: π/3    (~60°)  — bottom, 6 o'clock to 8 o'clock
    //      Blue:   5π/6 to -π/2   sweep: 2π/3   (~120°) — left, 8 o'clock to 12 o'clock
    //
    //    (Approximate — exact Google G uses specific brand arc measurements)

    final rect = Rect.fromCircle(
      center: Offset(cx, cy),
      radius: arcR,
    );

    // Blue arc: left side (8 o'clock → 12 o'clock, going clockwise from ~150° to ~270°)
    paint.color = _blue;
    canvas.drawArc(rect, math.pi * (5 / 6), math.pi * (2 / 3), false, paint);

    // Red arc: top (12 o'clock → ~4 o'clock)
    paint.color = _red;
    canvas.drawArc(rect, -math.pi / 2, math.pi * (5 / 6), false, paint);

    // Yellow arc: bottom-right (4 o'clock → 6 o'clock)
    paint.color = _yellow;
    canvas.drawArc(rect, math.pi / 3, math.pi / 6, false, paint);

    // Green arc: bottom (6 o'clock → 8 o'clock)
    paint.color = _green;
    canvas.drawArc(rect, math.pi / 2, math.pi / 3, false, paint);

    // ── Horizontal bar of the "G" (right side, pointing inward)
    final barPaint = Paint()
      ..color = _blue
      ..style = PaintingStyle.fill;

    // The bar runs from the centre horizontally to the right arc at the midline
    final barTop = cy - strokeWidth * 0.5;
    final barBottom = cy + strokeWidth * 0.5;
    // Left edge: just past centre
    final barLeft = cx - r * 0.02;
    // Right edge: meets the inner edge of the blue arc
    final barRight = cx + outerR;

    canvas.drawRect(
      Rect.fromLTRB(barLeft, barTop, barRight, barBottom),
      barPaint,
    );

    // Small white wedge to "open" the G on the upper-right (cut the arc)
    // This is the gap between the end of the red arc and the bar
    final gapPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    // Draw a white sector to clear the upper-right gap area
    final gapPath = Path()
      ..moveTo(cx, cy)
      ..arcTo(
        Rect.fromCircle(center: Offset(cx, cy), radius: outerR + 1),
        -math.pi / 2 - 0.05,
        -(math.pi / 6),
        false,
      )
      ..lineTo(cx, cy)
      ..close();
    canvas.drawPath(gapPath, gapPaint);

    // Also clear the inner circle so the arc ring is visible (white fill center)
    canvas.drawCircle(Offset(cx, cy), innerR, gapPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
