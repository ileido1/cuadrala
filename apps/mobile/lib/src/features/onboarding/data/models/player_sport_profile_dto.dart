enum SidePreference { right, left, any }

String sidePreferenceToWire(SidePreference s) {
  switch (s) {
    case SidePreference.right:
      return 'RIGHT';
    case SidePreference.left:
      return 'LEFT';
    case SidePreference.any:
      return 'ANY';
  }
}

SidePreference sidePreferenceFromWire(String? raw) {
  switch (raw) {
    case 'RIGHT':
      return SidePreference.right;
    case 'LEFT':
      return SidePreference.left;
    default:
      return SidePreference.any;
  }
}

final class PlayerSportProfileDto {
  const PlayerSportProfileDto({
    required this.id,
    required this.sportId,
    required this.skillLevel,
    required this.sidePreference,
  });

  final String id;
  final String sportId;
  final double skillLevel;
  final SidePreference sidePreference;

  static PlayerSportProfileDto fromJson(Map<String, Object?> json) {
    return PlayerSportProfileDto(
      id: json['id'] as String,
      sportId: json['sportId'] as String,
      skillLevel: (json['skillLevel'] as num).toDouble(),
      sidePreference: sidePreferenceFromWire(json['sidePreference'] as String?),
    );
  }
}
