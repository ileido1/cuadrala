/// Un partido del jugador en el torneo, con día, hora, cancha y rival.
///
/// Responde la pregunta concreta —"¿cuándo y dónde juego?"— sin obligar a la
/// app a recorrer el cuadro entero buscándose.
final class MyTournamentMatchDto {
  const MyTournamentMatchDto({
    required this.roundNumber,
    required this.matchNumber,
    required this.partners,
    required this.opponents,
    required this.decision,
    this.scheduledAt,
    this.courtName,
    this.myResponse,
  });

  final int roundNumber;
  final int matchNumber;

  /// `null` mientras el partido no tenga cancha apartada.
  final DateTime? scheduledAt;
  final String? courtName;

  /// Con quién juego: vacío en individual, un nombre en duplas.
  final List<String> partners;
  final List<String> opponents;

  /// `ACCEPTED`, `REJECTED`, o `null` si todavía no contesté.
  final String? myResponse;

  /// Cómo quedó el partido con las respuestas de todos.
  final String decision;

  bool get hasSlot => scheduledAt != null;
  bool get answered => myResponse != null;

  static MyTournamentMatchDto fromJson(Map<String, Object?> json) {
    final rawAt = json['scheduledAt'];
    return MyTournamentMatchDto(
      roundNumber: (json['roundNumber'] as num?)?.toInt() ?? 0,
      matchNumber: (json['matchNumber'] as num?)?.toInt() ?? 0,
      scheduledAt: rawAt is String ? DateTime.tryParse(rawAt) : null,
      courtName: json['courtName'] as String?,
      partners: _namesSV(json['partners']),
      opponents: _namesSV(json['opponents']),
      myResponse: json['myResponse'] as String?,
      decision: (json['decision'] as String?) ?? 'PENDING',
    );
  }
}

List<String> _namesSV(Object? raw) =>
    raw is List ? raw.whereType<String>().toList(growable: false) : const [];
