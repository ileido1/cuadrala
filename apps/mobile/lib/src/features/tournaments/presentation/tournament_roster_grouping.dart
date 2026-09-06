import '../data/models/tournament_registration_dto.dart';

/// Una dupla armada del torneo.
class TournamentPair {
  const TournamentPair({required this.first, required this.second});

  final TournamentRegistrationDto first;
  final TournamentRegistrationDto second;

  /// La dupla está lista para el cuadro solo si sus dos mitades lo están.
  bool get isConfirmed =>
      first.status == 'CONFIRMED' && second.status == 'CONFIRMED';

  String get label => '${first.displayName} · ${second.displayName}';
}

class TournamentRoster {
  const TournamentRoster({required this.pairs, required this.unpaired});

  final List<TournamentPair> pairs;
  final List<TournamentRegistrationDto> unpaired;
}

/// Agrupa el roster para mostrarlo.
///
/// En torneo individual devuelve todo en [TournamentRoster.unpaired] y la
/// pantalla lo renderiza como siempre: una fila por persona.
///
/// En torneo de duplas fijas junta a cada pareja en una sola fila —listarla por
/// cada miembro mostraría el doble de parejas de las que hay— y deja aparte a
/// quienes todavía no tienen compañero, que es lo que el organizador necesita
/// ver antes de generar el cuadro.
TournamentRoster groupRosterIntoPairs({
  required List<TournamentRegistrationDto> registrations,
  required bool paired,
}) {
  final active =
      registrations.where((r) => r.status != 'WITHDRAWN').toList(growable: false);

  if (!paired) {
    return TournamentRoster(pairs: const [], unpaired: active);
  }

  final byId = {for (final r in active) r.id: r};
  final pairs = <TournamentPair>[];
  final unpaired = <TournamentRegistrationDto>[];
  final seen = <String>{};

  for (final reg in active) {
    if (seen.contains(reg.id)) continue;

    final partnerId = reg.partnerRegistrationId;
    final partner = partnerId == null ? null : byId[partnerId];

    //? Apuntar a alguien que no está en el roster es media dupla: se muestra
    //? como sin pareja para que el organizador lo resuelva.
    if (partner == null) {
      unpaired.add(reg);
      seen.add(reg.id);
      continue;
    }

    seen.add(reg.id);
    seen.add(partner.id);
    pairs.add(TournamentPair(first: reg, second: partner));
  }

  return TournamentRoster(pairs: pairs, unpaired: unpaired);
}
