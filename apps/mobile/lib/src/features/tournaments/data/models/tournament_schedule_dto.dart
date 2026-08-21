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
    this.matchId,
    this.scheduledAt,
    this.courtId,
    this.courtName,
  });

  final String id;
  final String label;
  final String status;

  /// Id of the materialized `Match` row once the tournament has transitioned
  /// OPEN → IN_PROGRESS. `null` until materialized (or until the backend
  /// exposes it — see `tournament-player-management-scheduling` apply-progress
  /// backlog: `GET /tournaments/:id/schedule` does not serialize these fields
  /// yet). Tap-to-live-match navigation is gated on this being non-null.
  final String? matchId;
  final DateTime? scheduledAt;
  final String? courtId;
  final String? courtName;

  factory TournamentScheduleMatchDto.fromJson(Map<String, Object?> json) {
    final scheduledAtRaw = json['scheduledAt'];
    return TournamentScheduleMatchDto(
      id: (json['id'] ?? '').toString(),
      label: (json['label'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      matchId: json['matchId'] as String?,
      scheduledAt: scheduledAtRaw is String ? DateTime.tryParse(scheduledAtRaw) : null,
      courtId: json['courtId'] as String?,
      courtName: json['courtName'] as String?,
    );
  }

  Map<String, Object?> toJson() => {
        'id': id,
        'label': label,
        'status': status,
        'matchId': matchId,
        'scheduledAt': scheduledAt?.toIso8601String(),
        'courtId': courtId,
        'courtName': courtName,
      };

  @override
  List<Object?> get props => [id, label, status, matchId, scheduledAt, courtId, courtName];
}

