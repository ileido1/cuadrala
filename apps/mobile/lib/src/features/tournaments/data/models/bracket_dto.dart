/// Estructura de un jugador en el bracket.
///
/// Es nullable porque el bracket puede tener "Bye" (avanza automático) o
/// "Por definir" (depende del cuadro anterior).
final class BracketPlayerDto {
  const BracketPlayerDto({
    this.registrationId,
    required this.userId,
    required this.displayName,
    required this.seedPosition,
  });

  final String? registrationId;
  final String? userId;
  final String displayName;
  final int seedPosition;

  static BracketPlayerDto? fromJson(Map<String, Object?>? json) {
    if (json == null) return null;
    return BracketPlayerDto(
      registrationId:
          json['registrationId'] as String? ?? json['userId'] as String?,
      userId: json['userId'] as String?,
      displayName: json['displayName'] as String,
      seedPosition: (json['seedPosition'] as num).toInt(),
    );
  }
}

/// Un puntaje individual dentro de `BracketMatchDto.score`.
///
/// El contrato real de `GET /tournaments/:id/bracket`
/// (`get_tournament_bracket.use_case.ts:18-27`) manda un puntaje por
/// participante (`{userId, points}`), no un arreglo de sets con claves
/// `playerAScore`/`playerBScore` — esas claves nunca existieron en la
/// respuesta real.
final class BracketScoreEntryDto {
  const BracketScoreEntryDto({required this.userId, required this.points});

  final String userId;
  final int points;

  static BracketScoreEntryDto fromJson(Map<String, Object?> json) {
    return BracketScoreEntryDto(
      userId: json['userId'] as String,
      points: (json['points'] as num).toInt(),
    );
  }
}

/// Un partido individual en el bracket.
final class BracketMatchDto {
  const BracketMatchDto({
    required this.matchNumber,
    required this.roundNumber,
    required this.playerA,
    required this.playerB,
    required this.winnerId,
    required this.score,
    required this.status,
    required this.matchId,
  });

  final int matchNumber;
  final int roundNumber;
  final BracketPlayerDto? playerA;
  final BracketPlayerDto? playerB;
  final String? winnerId;
  final List<BracketScoreEntryDto>? score;
  final String status; // 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BYE'
  final String? matchId;

  static BracketMatchDto fromJson(Map<String, Object?> json) {
    return BracketMatchDto(
      matchNumber: (json['matchNumber'] as num).toInt(),
      roundNumber: (json['roundNumber'] as num).toInt(),
      playerA: BracketPlayerDto.fromJson(
        json['playerA'] as Map<String, Object?>?,
      ),
      playerB: BracketPlayerDto.fromJson(
        json['playerB'] as Map<String, Object?>?,
      ),
      winnerId: json['winnerId'] as String?,
      score: json['score'] is List
          ? (json['score'] as List)
                .whereType<Map<String, Object?>>()
                .map(BracketScoreEntryDto.fromJson)
                .toList()
          : null,
      status: json['status'] as String? ?? 'PENDING',
      matchId: json['matchId'] as String?,
    );
  }
}

/// Una ronda del bracket (semifinales, finales, etc.).
final class BracketRoundDto {
  const BracketRoundDto({
    required this.roundNumber,
    required this.name,
    required this.matches,
  });

  final int roundNumber;
  final String name; // "Semifinales", "Finales", etc.
  final List<BracketMatchDto> matches;

  static BracketRoundDto fromJson(Map<String, Object?> json) {
    return BracketRoundDto(
      roundNumber: (json['roundNumber'] as num).toInt(),
      name: json['name'] as String,
      matches:
          (json['matches'] as List?)
              ?.whereType<Map<String, Object?>>()
              .map(BracketMatchDto.fromJson)
              .toList() ??
          [],
    );
  }
}

/// El bracket completo: todas las rondas del torneo.
final class BracketDto {
  const BracketDto({
    required this.tournamentId,
    required this.tournamentName,
    required this.totalRounds,
    required this.bracketSize,
    required this.rounds,
  });

  final String tournamentId;
  final String tournamentName;
  final int totalRounds;
  final int bracketSize;
  final List<BracketRoundDto> rounds;

  static BracketDto fromJson(Map<String, Object?> json) {
    return BracketDto(
      tournamentId: json['tournamentId'] as String,
      tournamentName: json['tournamentName'] as String,
      totalRounds: (json['totalRounds'] as num).toInt(),
      bracketSize: (json['bracketSize'] as num).toInt(),
      rounds:
          (json['rounds'] as List?)
              ?.whereType<Map<String, Object?>>()
              .map(BracketRoundDto.fromJson)
              .toList() ??
          [],
    );
  }
}
