import 'package:flutter_test/flutter_test.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/bracket_dto.dart';

void main() {
  test('parses guest bracket scores by registration without a user id', () {
    final match = BracketMatchDto.fromJson({
      'matchNumber': 1,
      'roundNumber': 1,
      'playerA': {
        'registrationId': 'reg-guest',
        'userId': null,
        'displayName': 'Invitada',
        'seedPosition': 1,
      },
      'playerB': {
        'registrationId': 'reg-player',
        'userId': 'user-2',
        'displayName': 'Jugador',
        'seedPosition': 2,
      },
      'winnerId': 'reg-guest',
      'score': [
        {'userId': null, 'tournamentRegistrationId': 'reg-guest', 'points': 6},
        {
          'userId': 'user-2',
          'tournamentRegistrationId': 'reg-player',
          'points': 3,
        },
      ],
      'status': 'COMPLETED',
      'matchId': 'match-1',
    });

    expect(match.playerA?.userId, isNull);
    expect(match.playerA?.registrationId, 'reg-guest');
    expect(match.score?.first.userId, isNull);
    expect(match.score?.first.tournamentRegistrationId, 'reg-guest');
    expect(match.playerA?.participantId, 'reg-guest');
  });
}
