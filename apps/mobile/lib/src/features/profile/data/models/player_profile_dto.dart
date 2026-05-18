class PlayerProfileDto {
  const PlayerProfileDto({
    required this.dominantHand,
    this.sidePreference,
    this.birthYear,
  });

  final String dominantHand;
  final String? sidePreference;
  final int? birthYear;

  factory PlayerProfileDto.fromJson(Map<String, Object?> json) {
    return PlayerProfileDto(
      dominantHand: json['dominantHand'] as String? ?? 'RIGHT',
      sidePreference: json['sidePreference'] as String?,
      birthYear: json['birthYear'] as int?,
    );
  }

  String get dominantHandLabel => switch (dominantHand.toUpperCase()) {
        'LEFT' => 'Zurdo',
        'AMBIDEXTROUS' => 'Ambidiestro',
        _ => 'Diestro',
      };
}
