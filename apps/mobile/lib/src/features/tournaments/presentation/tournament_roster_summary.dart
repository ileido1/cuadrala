import '../data/models/tournament_registration_dto.dart';
import 'tournament_roster_grouping.dart';

/// Lo que el organizador necesita saber antes de generar el cuadro.
///
/// El calendario se arma solo con los inscriptos confirmados, y en torneos de
/// duplas fijas además exige que todos tengan compañero. Enterarse de eso al
/// recibir un error es tarde: cuando falta gente por resolver, el aviso tiene
/// que estar antes de tocar el botón.
class TournamentRosterSummary {
  const TournamentRosterSummary({
    required this.confirmed,
    required this.pending,
    required this.unpaired,
  });

  final int confirmed;
  final int pending;

  /// Inscripciones sin compañero. Siempre 0 en torneos individuales.
  final int unpaired;

  /// `true` si generar el cuadro ahora dejaría gente afuera.
  bool get hasUnresolved => pending > 0 || unpaired > 0;

  /// Aviso para el organizador, o `null` si no hay nada que avisar.
  ///
  /// Distingue pendientes de sin-pareja porque se resuelven distinto: a los
  /// primeros se los confirma, a los segundos hay que emparejarlos.
  String? get warning {
    if (!hasUnresolved) return null;

    final parts = <String>[
      if (pending > 0)
        pending == 1
            ? '1 inscripción sin confirmar'
            : '$pending inscripciones sin confirmar',
      if (unpaired > 0)
        unpaired == 1 ? '1 jugador sin pareja' : '$unpaired jugadores sin pareja',
    ];

    return 'Si generás el calendario ahora quedan afuera: ${parts.join(' y ')}.';
  }
}

TournamentRosterSummary summarizeRoster({
  required List<TournamentRegistrationDto> registrations,
  required bool paired,
}) {
  final active = registrations.where((r) => r.status != 'WITHDRAWN').toList();
  final roster = groupRosterIntoPairs(registrations: active, paired: paired);

  return TournamentRosterSummary(
    confirmed: active.where((r) => r.status == 'CONFIRMED').length,
    pending: active.where((r) => r.status == 'PENDING').length,
    //? En torneo individual nadie está "sin pareja": la agrupación devuelve
    //? todo en esa bolsa, y contarla ahí sería una advertencia falsa.
    unpaired: paired ? roster.unpaired.length : 0,
  );
}
