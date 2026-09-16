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
    this.roundNumber,
    this.matchNumber,
    this.scheduledAt,
    this.courtId,
    this.courtName,
    this.matchStatus,
    this.decision = 'PENDING',
    this.rejectedByName,
    this.sides = const [],
    this.scores = const [],
  });

  final String id;
  final String label;
  final String status;

  /// Id of the materialized `Match` row once the tournament has transitioned
  /// OPEN → IN_PROGRESS. `null` until materialized. Tap-to-live-match
  /// navigation is gated on this being non-null.
  final String? matchId;
  final int? roundNumber;
  final int? matchNumber;
  final DateTime? scheduledAt;
  final String? courtId;
  final String? courtName;

  /// `Match.status` (`SCHEDULED`/`IN_PROGRESS`/`FINISHED`/`CANCELLED`), `null`
  /// until the match is materialized. Enriched by S6b's
  /// `TournamentScheduleMatchViewDTO` (D2).
  final String? matchStatus;

  /// How the proposed slot was answered by its players:
  /// `PENDING`/`ACCEPTED`/`REJECTED` (`tournament_slot_decision.ts`).
  final String decision;

  /// Name of whoever rejected the slot, only present when [decision] is
  /// `REJECTED`.
  final String? rejectedByName;

  /// Sides of the materialized match, empty until it exists.
  final List<TournamentScheduleMatchSideDto> sides;

  /// Recorded scores, empty until a result was registered.
  final List<TournamentScheduleMatchScoreDto> scores;

  factory TournamentScheduleMatchDto.fromJson(Map<String, Object?> json) {
    final scheduledAtRaw = json['scheduledAt'];
    final rawSides = json['sides'];
    final rawScores = json['scores'];
    return TournamentScheduleMatchDto(
      id: (json['id'] ?? '').toString(),
      label: (json['label'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      matchId: json['matchId'] as String?,
      roundNumber: (json['roundNumber'] as num?)?.toInt(),
      matchNumber: (json['matchNumber'] as num?)?.toInt(),
      scheduledAt: scheduledAtRaw is String ? DateTime.tryParse(scheduledAtRaw) : null,
      courtId: json['courtId'] as String?,
      courtName: json['courtName'] as String?,
      matchStatus: json['matchStatus'] as String?,
      decision: (json['decision'] as String?) ?? 'PENDING',
      rejectedByName: json['rejectedByName'] as String?,
      sides: rawSides is List
          ? rawSides
              .whereType<Map>()
              .map((e) => Map<String, Object?>.from(e))
              .map(TournamentScheduleMatchSideDto.fromJson)
              .toList()
          : const [],
      scores: rawScores is List
          ? rawScores
              .whereType<Map>()
              .map((e) => Map<String, Object?>.from(e))
              .map(TournamentScheduleMatchScoreDto.fromJson)
              .toList()
          : const [],
    );
  }

  Map<String, Object?> toJson() => {
        'id': id,
        'label': label,
        'status': status,
        'matchId': matchId,
        'roundNumber': roundNumber,
        'matchNumber': matchNumber,
        'scheduledAt': scheduledAt?.toIso8601String(),
        'courtId': courtId,
        'courtName': courtName,
        'matchStatus': matchStatus,
        'decision': decision,
        'rejectedByName': rejectedByName,
        'sides': sides.map((s) => s.toJson()).toList(),
        'scores': scores.map((s) => s.toJson()).toList(),
      };

  @override
  List<Object?> get props => [
        id,
        label,
        status,
        matchId,
        roundNumber,
        matchNumber,
        scheduledAt,
        courtId,
        courtName,
        matchStatus,
        decision,
        rejectedByName,
        sides,
        scores,
      ];
}

final class TournamentScheduleMatchSideDto extends Equatable {
  const TournamentScheduleMatchSideDto({
    required this.sideKey,
    required this.userIds,
    this.registrationIds = const [],
  });

  /// `teamLabel` when it exists; otherwise the participant's own `userId`,
  /// or the guest registration's id.
  final String sideKey;

  /// `null` entries are guests with no user account.
  final List<String?> userIds;
  final List<String> registrationIds;

  factory TournamentScheduleMatchSideDto.fromJson(Map<String, Object?> json) {
    final rawUserIds = json['userIds'];
    final rawRegistrationIds = json['registrationIds'];
    return TournamentScheduleMatchSideDto(
      sideKey: (json['sideKey'] ?? '').toString(),
      userIds: rawUserIds is List
          ? rawUserIds.map((e) => e as String?).toList()
          : const [],
      registrationIds: rawRegistrationIds is List
          ? rawRegistrationIds.whereType<String>().toList()
          : const [],
    );
  }

  Map<String, Object?> toJson() => {
        'sideKey': sideKey,
        'userIds': userIds,
        'registrationIds': registrationIds,
      };

  @override
  List<Object?> get props => [sideKey, userIds, registrationIds];
}

final class TournamentScheduleMatchScoreDto extends Equatable {
  const TournamentScheduleMatchScoreDto({
    this.userId,
    this.tournamentRegistrationId,
    required this.points,
  });

  final String? userId;
  final String? tournamentRegistrationId;
  final int points;

  factory TournamentScheduleMatchScoreDto.fromJson(Map<String, Object?> json) {
    final rawPoints = json['points'];
    return TournamentScheduleMatchScoreDto(
      userId: json['userId'] as String?,
      tournamentRegistrationId: json['tournamentRegistrationId'] as String?,
      points: rawPoints is int ? rawPoints : int.tryParse('$rawPoints') ?? 0,
    );
  }

  Map<String, Object?> toJson() => {
        if (userId != null) 'userId': userId,
        if (tournamentRegistrationId != null)
          'tournamentRegistrationId': tournamentRegistrationId,
        'points': points,
      };

  @override
  List<Object?> get props => [userId, tournamentRegistrationId, points];
}
