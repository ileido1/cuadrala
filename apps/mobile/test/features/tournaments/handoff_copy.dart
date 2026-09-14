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
