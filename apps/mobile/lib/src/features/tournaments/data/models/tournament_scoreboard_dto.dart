import 'package:equatable/equatable.dart';

final class TournamentScoreboardDto extends Equatable {
  const TournamentScoreboardDto({required this.rows});

  final List<TournamentScoreboardRowDto> rows;

  factory TournamentScoreboardDto.fromJson(Map<String, Object?> json) {
    final rawRows = json['rows'];
    final rows = rawRows is List
        ? rawRows
              .whereType<Map>()
              .map((e) => Map<String, Object?>.from(e))
              .map(TournamentScoreboardRowDto.fromJson)
              .toList()
        : <TournamentScoreboardRowDto>[];
    return TournamentScoreboardDto(rows: rows);
  }

  Map<String, Object?> toJson() => {
    'rows': rows.map((r) => r.toJson()).toList(),
  };

  @override
  List<Object?> get props => [rows];
}

final class TournamentScoreboardRowDto extends Equatable {
  const TournamentScoreboardRowDto({
    this.userId,
    this.tournamentRegistrationId,
    required this.name,
    required this.points,
    this.gamesPlayed = 0,
    this.gamesWon = 0,
    this.rank = 0,
  });

  final String? userId;
  final String? tournamentRegistrationId;
  final String name;
  final int points;
  final int gamesPlayed;
  final int gamesWon;
  final int rank;

  factory TournamentScoreboardRowDto.fromJson(Map<String, Object?> json) {
    return TournamentScoreboardRowDto(
      userId: json['userId'] as String?,
      tournamentRegistrationId: json['tournamentRegistrationId'] as String?,
      name: (json['name'] ?? '').toString(),
      points: (json['points'] as num?)?.toInt() ?? 0,
      gamesPlayed: (json['gamesPlayed'] as num?)?.toInt() ?? 0,
      gamesWon: (json['gamesWon'] as num?)?.toInt() ?? 0,
      rank: (json['rank'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, Object?> toJson() => {
    'userId': userId,
    'tournamentRegistrationId': tournamentRegistrationId,
    'name': name,
    'points': points,
    'gamesPlayed': gamesPlayed,
    'gamesWon': gamesWon,
    'rank': rank,
  };

  @override
  List<Object?> get props => [
    userId,
    tournamentRegistrationId,
    name,
    points,
    gamesPlayed,
    gamesWon,
    rank,
  ];
}
