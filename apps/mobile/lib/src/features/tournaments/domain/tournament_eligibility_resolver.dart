import '../presentation/widgets/tournament_entry_check.dart';

/// Resuelve la elegibilidad de un jugador para un torneo específico.
///
/// La decisión toma en cuenta: (1) todas las categorías que juega, (2) si fue invitado.
/// Una invitación sube lo que sea a elegible aunque no califique por categoría.
TournamentEligibility resolveTournamentEligibilitySV({
  required String tournamentCategoryId,
  required List<Map<String, String>>? playerRatings,
  required bool playerIsInvited,
}) {
  if (playerIsInvited) {
    return TournamentEligibility.invited;
  }

  if (playerRatings == null || playerRatings.isEmpty) {
    return TournamentEligibility.wrongCategory;
  }

  final qualifiesInThisCategory = playerRatings.any(
    (rating) => rating['categoryId'] == tournamentCategoryId,
  );

  return qualifiesInThisCategory
      ? TournamentEligibility.eligible
      : TournamentEligibility.wrongCategory;
}
