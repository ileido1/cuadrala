/// Deportes con categorías ordinales 8va–1ra.
///
/// Debe coincidir con `RACKET_SPORT_CODES` de la API
/// (`domain/services/category/sport_classification_catalog.ts`): allí se exige
/// lado preferido (drive/revés) para estos códigos y se rechaza `ANY` con 400.
/// Faltaba `BEACH_TENNIS`, así que la app nunca preguntaba el lado para ese
/// deporte y el guardado fallaba.
const racketSportCodes = {'PADEL', 'TENNIS', 'PICKLEBALL', 'BEACH_TENNIS'};

/// Deportes con 3 niveles: Recreativo / Intermedio / Competitivo.
const teamSportCodes = {'FOOTBALL5', 'BASKETBALL3X3', 'VOLLEY_BEACH'};

bool isRacketSportCode(String code) =>
    racketSportCodes.contains(code.toUpperCase());

bool isTeamSportCode(String code) => teamSportCodes.contains(code.toUpperCase());

enum SkillBand { basic, intermediate, advanced }

SkillBand? skillBandFromApi(String? value) {
  switch (value?.toUpperCase()) {
    case 'BASIC':
      return SkillBand.basic;
    case 'INTERMEDIATE':
      return SkillBand.intermediate;
    case 'ADVANCED':
      return SkillBand.advanced;
    default:
      return null;
  }
}

String skillBandLabel(SkillBand band) => switch (band) {
      SkillBand.basic => 'Básico',
      SkillBand.intermediate => 'Intermedio',
      SkillBand.advanced => 'Avanzado',
    };

String skillBandDescription(SkillBand band) => switch (band) {
      SkillBand.basic =>
        'Aprendiendo reglas básicas y el golpeo (8va–7ma).',
      SkillBand.intermediate =>
        'Dominio de paredes, control de bola y tácticas (6ta–4ta).',
      SkillBand.advanced =>
        'Técnica sólida, bandejas, víboras y competición (3ra–1ra).',
    };

String teamBandDescription(SkillBand band) => switch (band) {
      SkillBand.basic => 'Juego casual y recreativo.',
      SkillBand.intermediate => 'Buen nivel, juegas con regularidad.',
      SkillBand.advanced => 'Competís o jugáis en ligas exigentes.',
    };
