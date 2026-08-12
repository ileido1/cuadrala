import 'package:equatable/equatable.dart';

/// Franja horaria devuelta por el endpoint de disponibilidad de canchas.
///
/// A diferencia del estado previo (solo el ISO de los horarios disponibles),
/// conserva [isAvailable] y [reason] para que la UI pueda renderizar los
/// horarios ocupados como chips deshabilitados con el motivo de la
/// indisponibilidad (REQ-MCP-003 / diseño PR2).
final class SlotInfo extends Equatable {
  const SlotInfo({
    required this.scheduledAt,
    required this.isAvailable,
    this.reason,
  });

  /// ISO 8601 del inicio del bloque (convención wall-clock-as-UTC).
  final String scheduledAt;

  final bool isAvailable;

  /// Motivo de indisponibilidad (solo presente cuando `isAvailable=false`).
  ///
  /// Uno de: `OCCUPIED_MATCH`, `OCCUPIED_RESERVATION`,
  /// `INCOMPATIBLE_VACANT_HOUR`, `OUT_OF_RANGE`, `OUT_OF_OPENING_HOURS`.
  final String? reason;

  /// Etiqueta legible del motivo (UI en español). Null si no hay motivo.
  String? get reasonLabel => switch (reason) {
        'OCCUPIED_MATCH' => 'Ocupado — partido',
        'OCCUPIED_RESERVATION' => 'Ocupado — reserva',
        'INCOMPATIBLE_VACANT_HOUR' => 'Horario incompatible',
        'OUT_OF_RANGE' => 'Fuera de rango',
        'OUT_OF_OPENING_HOURS' => 'Fuera de horario',
        _ => null,
      };

  @override
  List<Object?> get props => [scheduledAt, isAvailable, reason];
}
