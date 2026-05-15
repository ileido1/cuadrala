import 'package:flutter/material.dart';

/// Tipo de booking según el spec de unificar-match-reservation.
enum BookingType {
  direct('DIRECT'),
  blocked('BLOCKED'),
  match('MATCH');

  const BookingType(this.value);
  final String value;

  static BookingType fromString(String value) {
    return BookingType.values.firstWhere(
      (e) => e.value == value,
      orElse: () => BookingType.direct,
    );
  }
}

/// Estado de match para bookings de tipo MATCH.
enum MatchStatus {
  scheduled('SCHEDULED'),
  inProgress('IN_PROGRESS'),
  finished('FINISHED'),
  cancelled('CANCELLED');

  const MatchStatus(this.value);
  final String value;

  static MatchStatus? fromString(String? value) {
    if (value == null) return null;
    return MatchStatus.values.firstWhere(
      (e) => e.value == value,
      orElse: () => MatchStatus.scheduled,
    );
  }
}

/// Visibilidad para bookings de tipo MATCH.
enum BookingVisibility {
  published('PUBLISHED'),
  draft('DRAFT'),
  privateValue('PRIVATE');

  const BookingVisibility(this.value);
  final String value;

  static BookingVisibility? fromString(String? value) {
    if (value == null) return null;
    return BookingVisibility.values.firstWhere(
      (e) => e.value == value,
      orElse: () => BookingVisibility.draft,
    );
  }
}

/// DTO unificado para bookings obtenido del API.
/// Reemplaza ReservationDto para el calendario unificado.
final class BookingItem {
  const BookingItem({
    required this.id,
    required this.venueId,
    required this.courtId,
    required this.courtName,
    required this.type,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.status,
    this.notes,
    this.matchId,
    this.organizerUserId,
    this.formatPresetId,
    this.maxParticipants,
    this.pricePerPlayerCents,
    this.visibility,
    this.matchStatus,
    this.totalAmountCents,
    this.paidAmountCents = 0,
    this.paymentStatus,
  });

  final String id;
  final String venueId;
  final String courtId;
  final String courtName;
  final BookingType type;
  final String date; // YYYY-MM-DD
  final String startTime; // HH:MM
  final String endTime; // HH:MM
  final String status;
  final String? notes;
  final String? matchId;
  final String? organizerUserId;
  final String? formatPresetId;
  final int? maxParticipants;
  final int? pricePerPlayerCents;
  final BookingVisibility? visibility;
  final MatchStatus? matchStatus;
  final int? totalAmountCents;
  final int paidAmountCents;
  final String? paymentStatus;

  static BookingItem fromJson(Map<String, Object?> json) {
    // Parse scheduledAt: Date -> date + startTime + endTime
    final scheduledAtStr = json['scheduledAt'] as String;
    final scheduledAt = DateTime.parse(scheduledAtStr);
    final dateStr =
        '${scheduledAt.year}-${scheduledAt.month.toString().padLeft(2, '0')}-${scheduledAt.day.toString().padLeft(2, '0')}';
    final startTimeStr =
        '${scheduledAt.hour.toString().padLeft(2, '0')}:${scheduledAt.minute.toString().padLeft(2, '0')}';

    final durationMinutes = json['durationMinutes'] as int? ?? 60;
    final endDateTime = scheduledAt.add(Duration(minutes: durationMinutes));
    final endTimeStr =
        '${endDateTime.hour.toString().padLeft(2, '0')}:${endDateTime.minute.toString().padLeft(2, '0')}';

    return BookingItem(
      id: json['id'] as String,
      venueId: json['venueId'] as String,
      courtId: json['courtId'] as String,
      courtName: (json['courtName'] as String?) ?? 'Cancha',
      type: BookingType.fromString((json['type'] as String?) ?? 'DIRECT'),
      date: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      status: (json['status'] as String?) ?? 'CONFIRMED',
      notes: json['notes'] as String?,
      matchId: json['matchId'] as String?,
      organizerUserId: json['organizerUserId'] as String?,
      formatPresetId: json['formatPresetId'] as String?,
      maxParticipants: json['maxParticipants'] as int?,
      pricePerPlayerCents: json['pricePerPlayerCents'] as int?,
      visibility: BookingVisibility.fromString(json['visibility'] as String?),
      matchStatus: MatchStatus.fromString(json['matchStatus'] as String?),
      totalAmountCents: json['totalAmountCents'] as int?,
      paidAmountCents: json['paidAmountCents'] as int? ?? 0,
      paymentStatus: json['paymentStatus'] as String?,
    );
  }

  String get displayName {
    switch (type) {
      case BookingType.match:
        final count = 0; // participantCount not stored, would need separate query
        final max = maxParticipants ?? 4;
        return 'Match $count/$max';
      case BookingType.blocked:
        return 'Bloqueado';
      case BookingType.direct:
        return courtName.isNotEmpty ? courtName : 'Reserva';
    }
  }

  Color get color {
    if (status == 'CANCELLED') return Colors.red;
    switch (type) {
      case BookingType.match:
        return Colors.blue;
      case BookingType.blocked:
        return Colors.red.shade800;
      case BookingType.direct:
        return Colors.green;
    }
  }

  bool get isMatch => type == BookingType.match;
  bool get isBlocked => type == BookingType.blocked;
  bool get isDirect => type == BookingType.direct;
  bool get isPublished => visibility == BookingVisibility.published;
}