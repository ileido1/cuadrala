import 'package:equatable/equatable.dart';

/// DTO for a tournament list item returned by GET /api/v1/tournaments.
final class TournamentListItemDto extends Equatable {
  const TournamentListItemDto({
    required this.id,
    required this.name,
    required this.status,
    required this.sportName,
    required this.categoryName,
    required this.startsAt,
    required this.registrationCount,
    this.imageUrl,
    this.organizerUserId,
    this.visibility = 'PUBLIC',
    this.pairedRegistration = false,
    this.venueId,
    this.venueName,
    this.inscriptionPrice,
    this.maxSlots,
    this.registrationClosesAt,
  });

  final String id;
  final String name;
  final String status;
  final String sportName;
  final String categoryName;
  final DateTime? startsAt;
  final int registrationCount;
  final String? imageUrl;

  /// `PUBLIC` (listado en catálogo) o `PRIVATE` (solo por link directo).
  final String visibility;

  /// `true` cuando se compite en duplas fijas: el organizador arma las parejas
  /// y el roster se muestra por dupla, no por persona.
  ///
  /// No confundir con AMERICANO, que también es 2v2 pero rota compañero cada
  /// ronda: ahí la inscripción sigue siendo individual.
  final bool pairedRegistration;

  /// Owner of the tournament (drives organizer-only UI controls).
  /// Used to avoid fetching tournament detail just to check organizer status.
  final String? organizerUserId;

  /// Sede del torneo. `null` cuando el organizador no la declaró.
  final String? venueId;
  final String? venueName;

  /// Precio por jugador. `0` es "gratis declarado"; `null` es "sin declarar",
  /// y la tarjeta los pinta distinto: uno dice Gratis, el otro no muestra fila.
  final double? inscriptionPrice;

  /// Cupo máximo declarado. Sin esto no hay denominador para "11/16 inscriptos"
  /// ni barra de ocupación.
  final int? maxSlots;

  /// Cierre informativo de la inscripción. La ventana real la manda [status]:
  /// la API sigue aceptando altas mientras el torneo esté en DRAFT u OPEN.
  final DateTime? registrationClosesAt;

  factory TournamentListItemDto.fromJson(Map<String, Object?> json) {
    return TournamentListItemDto(
      id: json['id'] as String,
      name: json['name'] as String,
      status: json['status'] as String,
      pairedRegistration: json['pairedRegistration'] as bool? ?? false,
      sportName: (json['sportName'] ?? json['sport_name'] ?? '') as String,
      categoryName:
          (json['categoryName'] ?? json['category_name'] ?? '') as String,
      startsAt: json['startsAt'] != null || json['starts_at'] != null
          ? DateTime.tryParse(
              (json['startsAt'] ?? json['starts_at']) as String)
          : null,
      registrationCount:
          (json['registrationCount'] ??
                  json['registration_count'] ??
                  0) as int,
      imageUrl: json['imageUrl'] as String? ?? json['image_url'] as String?,
      organizerUserId:
          json['organizerUserId'] as String? ?? json['organizer_user_id'] as String?,
      visibility:
          (json['visibility'] as String?) ?? 'PUBLIC',
      venueId: json['venueId'] as String? ?? json['venue_id'] as String?,
      venueName: json['venueName'] as String? ?? json['venue_name'] as String?,
      //? Decimal serializado: puede llegar int (15) o double (12.5).
      inscriptionPrice: _parseNumericFieldSV(
        json['inscriptionPrice'],
        json['inscription_price'],
      ),
      maxSlots: _parseIntFieldSV(json['maxSlots'], json['max_slots']),
      registrationClosesAt: _parseDateTimeFieldSV(
        json['registrationClosesAt'],
        json['registration_closes_at'],
      ),
    );
  }

  static double? _parseNumericFieldSV(Object? camel, Object? snake) {
    final value = camel ?? snake;
    if (value is num) return value.toDouble();
    return null;
  }

  static int? _parseIntFieldSV(Object? camel, Object? snake) {
    return (camel ?? snake) as int?;
  }

  static DateTime? _parseDateTimeFieldSV(Object? camel, Object? snake) {
    final value = camel ?? snake;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  @override
  List<Object?> get props => [
        id,
        name,
        status,
        visibility,
        sportName,
        categoryName,
        startsAt,
        registrationCount,
        imageUrl,
        organizerUserId,
        pairedRegistration,
        venueId,
        venueName,
        inscriptionPrice,
        maxSlots,
        registrationClosesAt,
      ];
}
