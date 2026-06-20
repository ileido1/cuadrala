import 'package:flutter/material.dart';

/// Tag neutro no interactivo (superficie de cancha, atributo corto de venue).
///
/// Spec canónica tomada de la card de partida del rediseño: fondo
/// `surfaceContainerHighest`, borde `outlineVariant` 1.5px, texto muted.
class SurfaceTag extends StatelessWidget {
  const SurfaceTag({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: scheme.onSurfaceVariant,
          fontWeight: FontWeight.w800,
          fontSize: 10.5,
        ),
      ),
    );
  }
}
