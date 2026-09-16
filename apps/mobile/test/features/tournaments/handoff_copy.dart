/// Verbatim UI copy quoted from `apps/mobile/design_handoff_torneos/`.
///
/// Widget tests assert `find.text(...)` against these constants instead of
/// duplicating the handoff's literal strings across test files, so a typo or
/// a paraphrase is caught in one place. Each constant cites the exact
/// `file:line` it was copied from, per the copy-fidelity testing strategy in
/// `sdd/tournaments-handoff-fidelity/design`.
library;

/// `cuadrala-torneos.jsx:188` — `` `Mi categoría ${USER.cat}` ``.
///
/// `USER.cat` is the viewer's category label (e.g. `"7ma"`), not a raw
/// integer — mirrors `UserPrimaryRatingDto.categoryName`.
String miCategoriaLabel(String categoryLabel) => 'Mi categoría $categoryLabel';

/// `cuadrala-torneos.jsx:118-122` — inline registration badge on a "Mis
/// torneos" card: `'Adentro'` when CONFIRMED, `'Pendiente'` otherwise.
String viewerRegistrationStatusLabel(String registrationStatus) =>
    registrationStatus == 'CONFIRMED' ? 'Adentro' : 'Pendiente';

/// `cuadrala-torneo-org.jsx:359` — `` `${t.org} te invitó` ``. `org` resolves
/// to `venueName`, falling back to the organizer's display name when there is
/// no venue (spec "Listado — invitation banner and organizer row"; design D7).
String invitationBannerTitle(String org) => '$org te invitó';

/// `cuadrala-torneos.jsx:172`, `README.md:51` — `` `${action} →` `` link on
/// the invitation banner.
const String invitationBannerAction = 'Ver invitación →';

/// `cuadrala-torneos.jsx:179` — `` `Organizás ${t.name}` `` on the lime
/// shield organizer row.
String organizerRowTitle(String tournamentName) => 'Organizás $tournamentName';

/// `cuadrala-torneos.jsx:281` — `` `${t.confirmed} confirmados` `` on the
/// Inscritos summary row.
String inscritosConfirmedLabel(int confirmed) => '$confirmed confirmados';

/// `cuadrala-torneos.jsx:282` — `` `${t.pending} esperando al organizador` ``,
/// only rendered when `t.pending > 0`.
String inscritosPendingLabel(int pending) =>
    '$pending esperando al organizador';

/// `cuadrala-torneos.jsx:268` — `` `${t.size} jugadores` `` on the "Cuadro"
/// tile.
String cuadroTileValue(int maxSlots) => '$maxSlots jugadores';

/// `cuadrala-torneos.jsx:7,10,13,16,117` — the gender tag rendered next to
/// the category chip on the tournament card. `MALE`/`FEMALE`/`MIXED`
/// (`MatchGender`, S2) map to the same Spanish labels already used by
/// `discover_matches_screen.dart` and `venue_booking_form.dart`. An
/// unrecognized code returns `null` — the tag hides rather than showing the
/// raw enum (same fail-closed rule as `tournamentStatusLabel`).
String? genderTagLabel(String gender) => switch (gender) {
      'MALE' => 'Masculino',
      'FEMALE' => 'Femenino',
      'MIXED' => 'Mixto',
      _ => null,
    };

/// `cuadrala-torneo-org.jsx:112` — status label on a row of the organizer's
/// "Invitaciones enviadas" list: `'Sin responder'` while PENDING, `'Rechazó'`
/// once REJECTED (spec "Org invitations — Rechazó/Sin responder, names,
/// Invitado/Invitar"; M10b). Rejected invitations render this label instead of
/// being filtered out of the list.
String sentInvitationStatusLabel(bool isPending) =>
    isPending ? 'Sin responder' : 'Rechazó';

/// `cuadrala-torneo-org.jsx:338` — the SE-only automatic-advancement caption
/// on the organizer's Cuadro tab (spec "Org Cuadro — result caption"; D12).
/// Renders verbatim only for SINGLE_ELIMINATION tournaments.
const String seAdvancementCaption =
    'El ganador pasa de ronda automáticamente y a los dos les llega el resultado.';
