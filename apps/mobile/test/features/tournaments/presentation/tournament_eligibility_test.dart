import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/domain/tournament_eligibility_resolver.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/tournament_entry_check.dart';

void main() {
  group('Tournament eligibility resolution', () {
    test('should mark player as eligible when they play the tournament category',
        () {
      final playerRatings = [
        {'categoryId': 'cat-7ma', 'categoryName': '7ma'},
        {'categoryId': 'cat-6ta', 'categoryName': '6ta'},
      ];
      final tournamentCategoryId = 'cat-7ma';

      final result = resolveTournamentEligibilitySV(
        tournamentCategoryId: tournamentCategoryId,
        playerRatings: playerRatings,
        playerIsInvited: false,
      );

      expect(result, TournamentEligibility.eligible);
    });

    test('should mark player as wrong category when they dont play it', () {
      final playerRatings = [
        {'categoryId': 'cat-6ta', 'categoryName': '6ta'},
      ];
      final tournamentCategoryId = 'cat-7ma';

      final result = resolveTournamentEligibilitySV(
        tournamentCategoryId: tournamentCategoryId,
        playerRatings: playerRatings,
        playerIsInvited: false,
      );

      expect(result, TournamentEligibility.wrongCategory);
    });

    test('should mark as eligible when invited despite category mismatch', () {
      final playerRatings = [
        {'categoryId': 'cat-6ta', 'categoryName': '6ta'},
      ];
      final tournamentCategoryId = 'cat-7ma';

      final result = resolveTournamentEligibilitySV(
        tournamentCategoryId: tournamentCategoryId,
        playerRatings: playerRatings,
        playerIsInvited: true,
      );

      expect(result, TournamentEligibility.invited);
    });

    test('should handle null/empty ratings as not eligible', () {
      final result = resolveTournamentEligibilitySV(
        tournamentCategoryId: 'cat-7ma',
        playerRatings: null,
        playerIsInvited: false,
      );

      expect(result, TournamentEligibility.wrongCategory);
    });
  });
}
