/// Tipos de reserva según el spec de backoffice-reservations.
enum ReservationType {
  reservation('RESERVATION'),
  blocked('BLOCKED'),
  tournament('TOURNAMENT');

  const ReservationType(this.value);
  final String value;

  static ReservationType fromString(String value) {
    return ReservationType.values.firstWhere(
      (e) => e.value == value,
      orElse: () => ReservationType.reservation,
    );
  }
}

/// DTO para una reserva obtenido del API.
final class ReservationDto {
  const ReservationDto({
    required this.id,
    required this.venueId,
    required this.courtId,
    required this.courtName,
    required this.type,
    required this.date,
    required this.startTime,
    required this.endTime,
    this.notes,
    this.matchId,
  });

  final String id;
  final String venueId;
  final String courtId;
  final String courtName;
  final ReservationType type;
  final String date; // YYYY-MM-DD
  final String startTime; // HH:MM
  final String endTime; // HH:MM
  final String? notes;
  final String? matchId;

  static ReservationDto fromJson(Map<String, Object?> json) {
    return ReservationDto(
      id: json['id'] as String,
      venueId: json['venueId'] as String,
      courtId: json['courtId'] as String,
      courtName: (json['courtName'] as String?) ?? 'Cancha',
      type: ReservationType.fromString((json['type'] as String?) ?? 'RESERVATION'),
      date: json['date'] as String,
      startTime: json['startTime'] as String,
      endTime: json['endTime'] as String,
      notes: json['notes'] as String?,
      matchId: json['matchId'] as String?,
    );
  }
}