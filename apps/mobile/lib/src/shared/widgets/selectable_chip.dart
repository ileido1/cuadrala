import 'package:flutter/material.dart';

import '../../core/theme/brand_colors.dart';

/// Chip seleccionable (rediseño Cuádrala).
///
/// - Apagado: `surfaceContainerHighest` + borde `outlineVariant` + texto muted.
/// - Encendido (verde): tinte verde + borde verde + texto verde + check.
/// - Encendido (lime): fondo lima + texto navy (para badges destacados).
class SelectableChip extends StatelessWidget {
  const SelectableChip({
    super.key,
    required this.label,
    required this.selected,
    this.onTap,
    this.accent = ChipAccent.green,
    this.icon,
  });

  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final ChipAccent accent;

  /// Ícono opcional al inicio (sustituye al check cuando está presente).
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isLime = accent == ChipAccent.lime;

    final Color fg;
    final Color bg;
    final Color border;
    if (selected) {
      fg = isLime ? BrandColors.navy : scheme.primary;
      bg = isLime
          ? BrandColors.limeAccent
          : scheme.primary.withValues(alpha: 0.15);
      border = isLime ? BrandColors.limeAccent : scheme.primary;
    } else {
      fg = scheme.onSurfaceVariant;
      bg = scheme.surfaceContainerHighest;
      border = scheme.outlineVariant;
    }

    final leading = icon ?? (selected ? Icons.check_rounded : null);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        height: 38,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border, width: 1.5),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (leading != null) ...[
              Icon(leading, size: 16, color: fg),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: fg,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Acento de color para [SelectableChip].
enum ChipAccent { green, lime }
