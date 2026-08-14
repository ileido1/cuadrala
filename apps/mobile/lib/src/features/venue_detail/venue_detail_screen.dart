import 'package:flutter/material.dart';

/// Placeholder de la pantalla de detalle de sede.
///
/// PR1 solo registra la ruta `/descubrir/:venueId` para que el mini-sheet
/// pueda navegar con "Ver detalles". PR2 reemplaza este widget por el detalle
/// completo (nombre, dirección, deportes, rating, canchas, horarios).
class VenueDetailScreen extends StatelessWidget {
  const VenueDetailScreen({super.key, required this.venueId});

  final String venueId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: Center(
        child: Text(
          'Detalle de sede $venueId',
          style: Theme.of(context).textTheme.titleMedium,
        ),
      ),
    );
  }
}
