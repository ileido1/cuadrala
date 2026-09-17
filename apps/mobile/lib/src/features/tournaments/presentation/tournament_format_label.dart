/// Etiqueta en español para `TournamentListItemDto.formatPresetName`.
///
/// `formatPresetName` no es un nombre listo para mostrar: es el CODE del
/// preset (`SINGLE_ELIMINATION`, `ROUND_ROBIN`, ...), el mismo valor que
/// `get_tournament_bracket.use_case.ts:97` compara para decidir si un
/// torneo tiene cuadro. La tarjeta "Formato" del handoff
/// (`cuadrala-torneos.jsx:268`) espera texto legible ("Eliminación
/// simple"), nunca el nombre del deporte ni el code crudo de un preset
/// conocido.
///
/// A diferencia de `tournamentStatusLabel` (que falla cerrado a "Estado
/// desconocido"), un preset sin mapeo muestra su nombre tal cual: el
/// diseño lo pide así ("other codes show the raw name", `design` D17)
/// porque un preset nuevo sigue siendo información útil, no un estado
/// inválido que haya que esconder.
String tournamentFormatLabel(String? presetCode) => switch (presetCode) {
  'SINGLE_ELIMINATION' => 'Eliminación simple',
  'Single Elimination' => 'Eliminación simple',
  'ROUND_ROBIN' => 'Round robin',
  'Round Robin' => 'Round robin',
  null => '',
  final other => other,
};

String tournamentFormatCode(String? preset) => switch (preset) {
  'Single Elimination' => 'SINGLE_ELIMINATION',
  'Round Robin' => 'ROUND_ROBIN',
  'Americano' => 'AMERICANO',
  final value => value ?? '',
};

enum TournamentFormatPresentation { bracket, standings, schedule }

TournamentFormatPresentation tournamentFormatPresentation(String? preset) =>
    switch (tournamentFormatCode(preset)) {
      'SINGLE_ELIMINATION' => TournamentFormatPresentation.bracket,
      'ROUND_ROBIN' || 'AMERICANO' => TournamentFormatPresentation.standings,
      _ => TournamentFormatPresentation.schedule,
    };
