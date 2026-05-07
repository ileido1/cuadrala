import 'package:equatable/equatable.dart';

final class TournamentPresetDto extends Equatable {
  const TournamentPresetDto({
    required this.sportId,
    required this.name,
    required this.suggestedBracketSize,
  });

  final String sportId;
  final String name;
  final int suggestedBracketSize;

  factory TournamentPresetDto.fromJson(Map<String, Object?> json) {
    return TournamentPresetDto(
      sportId: (json['sportId'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      suggestedBracketSize: (json['suggestedBracketSize'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, Object?> toJson() => {
        'sportId': sportId,
        'name': name,
        'suggestedBracketSize': suggestedBracketSize,
      };

  @override
  List<Object?> get props => [sportId, name, suggestedBracketSize];
}

