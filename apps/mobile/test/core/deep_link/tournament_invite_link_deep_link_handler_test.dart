import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/deep_link/tournament_invite_link_deep_link_handler.dart';

void main() {
  group('extractInviteTokenFromUri', () {
    test('should return the token when the path is a valid /invite/<token>', () {
      final uri = Uri.parse(
        'https://$kTournamentInviteLinkHost/invite/abc123XYZ',
      );

      final result = extractInviteTokenFromUri(uri);

      expect(result, 'abc123XYZ');
    });

    test('should return null when the path has no token segment', () {
      final uri = Uri.parse('https://$kTournamentInviteLinkHost/invite');

      final result = extractInviteTokenFromUri(uri);

      expect(result, isNull);
    });

    test('should return null when the path has extra segments after the token', () {
      final uri = Uri.parse(
        'https://$kTournamentInviteLinkHost/invite/abc123/extra',
      );

      final result = extractInviteTokenFromUri(uri);

      expect(result, isNull);
    });

    test('should return null when the first segment is not "invite"', () {
      final uri = Uri.parse(
        'https://$kTournamentInviteLinkHost/other/abc123',
      );

      final result = extractInviteTokenFromUri(uri);

      expect(result, isNull);
    });

    test('should return null when the host does not match the invite link domain', () {
      final uri = Uri.parse('https://otro-dominio.com/invite/abc123');

      final result = extractInviteTokenFromUri(uri);

      expect(result, isNull);
    });

    test('should return null when the token segment is empty', () {
      final uri = Uri.parse('https://$kTournamentInviteLinkHost/invite/');

      final result = extractInviteTokenFromUri(uri);

      expect(result, isNull);
    });
  });
}
