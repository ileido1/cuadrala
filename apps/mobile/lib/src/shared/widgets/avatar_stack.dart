import 'package:flutter/material.dart';

/// Pila de avatares solapados con iniciales, usada para mostrar los
/// participantes de una partida en las tarjetas (rediseño).
///
/// Es **presentacional**: recibe la lista de iniciales ya resuelta y, opcional,
/// cuántos huecos libres quedan ([emptySpots]) para renderizar marcadores
/// punteados al final.
class AvatarStack extends StatelessWidget {
  const AvatarStack({
    super.key,
    required this.initials,
    this.emptySpots = 0,
    this.maxVisible = 4,
    this.size = 30,
  });

  /// Iniciales de cada participante (p. ej. `['MR', 'JS']`).
  final List<String> initials;

  /// Número de huecos libres a representar con marcadores punteados.
  final int emptySpots;

  /// Máximo de avatares visibles antes de colapsar en `+N`.
  final int maxVisible;

  /// Diámetro de cada avatar.
  final double size;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final overlap = size * 0.36;

    final visible = initials.take(maxVisible).toList();
    final overflow = initials.length - visible.length;
    final emptyToShow =
        overflow > 0 ? 0 : (emptySpots).clamp(0, maxVisible - visible.length);

    final tiles = <Widget>[
      for (final ini in visible) _AvatarTile(label: ini, size: size),
      for (var i = 0; i < emptyToShow; i++) _EmptyTile(size: size),
      if (overflow > 0) _AvatarTile(label: '+$overflow', size: size, muted: true),
    ];

    if (tiles.isEmpty) return const SizedBox.shrink();

    final step = size - overlap;
    final totalWidth = size + (tiles.length - 1) * step;

    return SizedBox(
      width: totalWidth,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          for (var i = 0; i < tiles.length; i++)
            Positioned(
              left: i * step,
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: scheme.surface, width: 2),
                ),
                child: tiles[i],
              ),
            ),
        ],
      ),
    );
  }
}

class _AvatarTile extends StatelessWidget {
  const _AvatarTile({required this.label, required this.size, this.muted = false});

  final String label;
  final double size;
  final bool muted;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bg = muted
        ? scheme.surfaceContainerHighest
        : scheme.primary.withValues(alpha: 0.14);
    final fg = muted ? scheme.onSurfaceVariant : scheme.primary;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
      child: Text(
        label,
        style: TextStyle(
          color: fg,
          fontWeight: FontWeight.w900,
          fontSize: size * 0.36,
        ),
      ),
    );
  }
}

class _EmptyTile extends StatelessWidget {
  const _EmptyTile({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: scheme.surface,
        border: Border.all(
          color: scheme.outlineVariant,
          width: 1.4,
        ),
      ),
      child: Icon(
        Icons.add,
        size: size * 0.46,
        color: scheme.onSurfaceVariant.withValues(alpha: 0.7),
      ),
    );
  }
}
