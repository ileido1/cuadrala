import 'package:flutter/material.dart';

/// Pill informativo no interactivo (estado, categoría, nota corta).
///
/// Dos modos de color: pasá [color] para un fondo tintado al 15% con texto
/// del mismo color (estado/énfasis), o [background]+[foreground] para un
/// fondo sólido explícito (ej. categoría lima).
class InfoBadge extends StatelessWidget {
  const InfoBadge({
    super.key,
    required this.label,
    this.color,
    this.background,
    this.foreground,
    this.icon,
    this.dot = false,
    this.borderColor,
    this.fontSize = 12.5,
  }) : assert(
          color != null || (background != null && foreground != null),
          'Pasá color (tintado) o background+foreground (sólido).',
        );

  final String label;

  /// Modo tintado: fondo = `color@15%`, texto = `color`.
  final Color? color;

  /// Modo sólido: fondo y texto explícitos (ignora [color] si están presentes).
  final Color? background;
  final Color? foreground;

  /// Ícono inicial opcional (14px, color del texto).
  final IconData? icon;

  /// Punto de estado (7x7) antes del texto, en vez de [icon].
  final bool dot;

  /// Borde opcional de 1.5px.
  final Color? borderColor;

  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final bg = background ?? color!.withValues(alpha: 0.15);
    final fg = foreground ?? color!;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: borderColor == null
            ? null
            : Border.all(color: borderColor!, width: 1.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dot) ...[
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(color: fg, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
          ] else if (icon != null) ...[
            Icon(icon, size: 14, color: fg),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.w800,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }
}
