import 'package:flutter/material.dart';

import '../../../../core/theme/brand_colors.dart';
import '../tournament_status_view.dart';

/// Pill de estado del torneo (rediseño: listado y detalle).
///
/// La etiqueta sale siempre de [tournamentStatusLabel], que es la única fuente
/// de verdad del enum. La tarjeta del listado tenía su propio `switch` con
/// `REGISTRATION_OPEN` / `REGISTRATION_CLOSED` / `FINISHED` —estados de un
/// modelo anterior— así que `OPEN` y `COMPLETED` caían en el `default` y el
/// usuario veía el enum crudo. Un solo traductor evita que vuelva a pasar.
class TournamentStatusPill extends StatelessWidget {
  const TournamentStatusPill({super.key, required this.status});

  final String? status;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    //? "En juego" es el único que va sobre lima; el resto son tintes al 15%
    //? sobre la superficie, para que la pill no compita con el nombre.
    final (Color bg, Color fg) = switch (status?.toUpperCase()) {
      'OPEN' => (scheme.primary.withValues(alpha: 0.15), scheme.primary),
      'IN_PROGRESS' => (BrandColors.limeAccent, BrandColors.onLime),
      'CANCELLED' => (
          BrandColors.dangerRed.withValues(alpha: 0.16),
          BrandColors.dangerRed,
        ),
      _ => (scheme.surfaceContainerHighest, scheme.onSurfaceVariant),
    };

    return Container(
      key: const Key('tournament.status.pill'),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        tournamentStatusLabel(status),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.3,
          color: fg,
        ),
      ),
    );
  }
}
