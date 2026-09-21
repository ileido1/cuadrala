import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/profile/data/models/player_profile_dto.dart';

void main() {
  test('should preserve avatarUrl when profile JSON includes it', () {
    final profile = PlayerProfileDto.fromJson({
      'dominantHand': 'RIGHT',
      'avatarUrl': 'https://cdn.example.test/avatars/player.png',
    });

    expect(profile.avatarUrl, 'https://cdn.example.test/avatars/player.png');
  });

  test('should keep avatarUrl null when profile JSON omits it', () {
    final profile = PlayerProfileDto.fromJson({'dominantHand': 'RIGHT'});

    expect(profile.avatarUrl, isNull);
  });
}
