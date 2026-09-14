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
