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
    required this.teamId,
    required this.teamName,
    required this.points,
  });

  final String teamId;
  final String teamName;
  final int points;

  factory TournamentScoreboardRowDto.fromJson(Map<String, Object?> json) {
    return TournamentScoreboardRowDto(
      teamId: (json['teamId'] ?? '').toString(),
      teamName: (json['teamName'] ?? '').toString(),
      points: (json['points'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, Object?> toJson() => {
        'teamId': teamId,
        'teamName': teamName,
        'points': points,
      };

  @override
  List<Object?> get props => [teamId, teamName, points];
}

