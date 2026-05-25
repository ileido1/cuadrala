import '../../../core/formatting/id_preview.dart';
import '../../../core/models/currency_code.dart';
import '../data/models/match_detail_dto.dart';
import '../data/models/open_match_dto.dart';

/// Moneda de visualización del club (prioriza `displayCurrency`).
CurrencyCode venueDisplayCurrency({
  String? displayCurrency,
  String? pricingCurrency,
}) {
  return CurrencyCode.fromApiValue(displayCurrency ?? pricingCurrency);
}

String openMatchTitleLine(OpenMatchDto match) {
  final parts = <String>[
    if (match.clubName != null && match.clubName!.trim().isNotEmpty)
      match.clubName!.trim(),
    if (match.courtName != null && match.courtName!.trim().isNotEmpty)
      match.courtName!.trim(),
  ];
  if (parts.isEmpty) {
    return 'Partida ${idPreview(match.id)}';
  }
  return parts.join(' • ');
}

CurrencyCode openMatchDisplayCurrency(OpenMatchDto match) {
  return venueDisplayCurrency(
    displayCurrency: match.displayCurrency,
    pricingCurrency: match.pricingCurrency,
  );
}

CurrencyCode matchDetailDisplayCurrency(MatchDetailDto match) {
  return venueDisplayCurrency(
    displayCurrency: match.displayCurrency,
    pricingCurrency: match.pricingCurrency,
  );
}
