import 'package:equatable/equatable.dart';

final class TournamentScheduleDto extends Equatable {
  const TournamentScheduleDto({required this.rounds});

  final List<TournamentScheduleRoundDto> rounds;

  factory TournamentScheduleDto.empty() => const TournamentScheduleDto(rounds: []);

  factory TournamentScheduleDto.fromJson(Map<String, Object?> json) {
    final raw = json['rounds'];
    final rounds = raw is List
        ? raw
            .whereType<Map>()
            .map((e) => Map<String, Object?>.from(e))
            .map(TournamentScheduleRoundDto.fromJson)
            .toList()
        : <TournamentScheduleRoundDto>[];
    return TournamentScheduleDto(rounds: rounds);
  }

  Map<String, Object?> toJson() => {
        'rounds': rounds.map((r) => r.toJson()).toList(),
      };

  @override
  List<Object?> get props => [rounds];
}

final class TournamentScheduleRoundDto extends Equatable {
  const TournamentScheduleRoundDto({
    required this.name,
    required this.matches,
  });

  final String name;
  final List<TournamentScheduleMatchDto> matches;

  factory TournamentScheduleRoundDto.fromJson(Map<String, Object?> json) {
    final rawMatches = json['matches'];
    final matches = rawMatches is List
        ? rawMatches
            .whereType<Map>()
            .map((e) => Map<String, Object?>.from(e))
            .map(TournamentScheduleMatchDto.fromJson)
            .toList()
        : <TournamentScheduleMatchDto>[];
    return TournamentScheduleRoundDto(
      name: (json['name'] ?? '').toString(),
      matches: matches,
    );
  }

  Map<String, Object?> toJson() => {
        'name': name,
        'matches': matches.map((m) => m.toJson()).toList(),
      };

  @override
  List<Object?> get props => [name, matches];
}

final class TournamentScheduleMatchDto extends Equatable {
  const TournamentScheduleMatchDto({
    required this.id,
    required this.label,
    required this.status,
  });

  final String id;
  final String label;
  final String status;

  factory TournamentScheduleMatchDto.fromJson(Map<String, Object?> json) {
    return TournamentScheduleMatchDto(
      id: (json['id'] ?? '').toString(),
      label: (json['label'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
    );
  }

  Map<String, Object?> toJson() => {
        'id': id,
        'label': label,
        'status': status,
      };

  @override
  List<Object?> get props => [id, label, status];
}

