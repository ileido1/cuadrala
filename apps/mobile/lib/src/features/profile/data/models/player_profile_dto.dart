class PlayerProfileDto {
  const PlayerProfileDto({
    required this.dominantHand,
    this.sidePreference,
    this.birthYear,
    this.avatarUrl,
  });

  final String dominantHand;
  final String? sidePreference;
  final int? birthYear;
  final String? avatarUrl;

  factory PlayerProfileDto.fromJson(Map<String, Object?> json) {
    return PlayerProfileDto(
      dominantHand: json['dominantHand'] as String? ?? 'RIGHT',
      sidePreference: json['sidePreference'] as String?,
      birthYear: json['birthYear'] as int?,
      avatarUrl: json['avatarUrl'] as String?,
    );
  }

  String get dominantHandLabel => switch (dominantHand.toUpperCase()) {
    'LEFT' => 'Zurdo',
    'AMBIDEXTROUS' => 'Ambidiestro',
    _ => 'Diestro',
  };
}
