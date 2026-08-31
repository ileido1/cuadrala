/** Deportes con categorías ordinales 8va–1ra. Son los únicos que siembra el seed. */
export const RACKET_SPORT_CODES = ['PADEL', 'TENNIS', 'PICKLEBALL', 'BEACH_TENNIS'] as const;

/** Nombre legible por código. Vive junto a los códigos para no duplicarse. */
export const SPORT_NAMES: Record<string, string> = {
  PADEL: 'Pádel',
  TENNIS: 'Tenis',
  PICKLEBALL: 'Pickleball',
  BEACH_TENNIS: 'Beach Tennis',
};

/**
 * Deportes con 3 tiers: Recreativo / Intermedio / Competitivo.
 *
 * Fuera de alcance por ahora: el seed no crea ninguno de estos códigos, así que
 * todo lo que cuelga de acá (`isTeamSportCodeSV`,
 * `skillLevelFromTeamTierSlugSV`) es código vivo sobre datos que hoy no existen.
 * Se conserva para no reescribirlo si vuelven los deportes de equipo.
 */
export const TEAM_SPORT_CODES = ['FOOTBALL5', 'BASKETBALL3X3', 'VOLLEY_BEACH'] as const;

export type RacketOrdinalSlug =
  | '8va'
  | '7ma'
  | '6ta'
  | '5ta'
  | '4ta'
  | '3ra'
  | '2da'
  | '1ra';

export type TeamTierSlug = 'recreativo' | 'intermedio' | 'competitivo';

/**
 * @name    :isRacketSportCodeSV
 * @version :1.0.0
 * @description :Indica si el código corresponde a un deporte de raqueta o pala.
 * @param {string} _code - Código del deporte, en cualquier capitalización
 * @return {boolean}
 */
export function isRacketSportCodeSV(_code: string): boolean {
  return (RACKET_SPORT_CODES as readonly string[]).includes(_code.toUpperCase());
}

/**
 * @name    :isTeamSportCodeSV
 * @version :1.0.0
 * @description :Indica si el código corresponde a un deporte de equipo. Hoy
 * siempre devuelve false en la práctica: ver la nota en `TEAM_SPORT_CODES`.
 * @param {string} _code - Código del deporte, en cualquier capitalización
 * @return {boolean}
 */
export function isTeamSportCodeSV(_code: string): boolean {
  return (TEAM_SPORT_CODES as readonly string[]).includes(_code.toUpperCase());
}

/**
 * @name    :skillLevelFromRacketSlugSV
 * @version :1.0.0
 * @description :Traduce una categoría ordinal a la escala 1.0–7.0 de skillLevel
 * autodeclarado. 1ra es el nivel más alto, 8va el más bajo.
 * @param {string} _slug - Slug de la categoría (`8va` a `1ra`)
 * @return {number} skillLevel; 3.5 si el slug no se reconoce
 */
export function skillLevelFromRacketSlugSV(_slug: string): number {
  const MAP: Record<string, number> = {
    '8va': 1.5,
    '7ma': 2.0,
    '6ta': 2.5,
    '5ta': 3.0,
    '4ta': 3.5,
    '3ra': 4.5,
    '2da': 5.5,
    '1ra': 6.5,
  };
  return MAP[_slug] ?? 3.5;
}

/**
 * @name    :skillLevelFromTeamTierSlugSV
 * @version :1.0.0
 * @description :Traduce un tier de equipo a la escala 1.0–7.0 de skillLevel.
 * @param {string} _slug - `recreativo`, `intermedio` o `competitivo`
 * @return {number} skillLevel; 3.5 si el slug no se reconoce
 */
export function skillLevelFromTeamTierSlugSV(_slug: string): number {
  const MAP: Record<string, number> = {
    recreativo: 2.0,
    intermedio: 3.5,
    competitivo: 5.0,
  };
  return MAP[_slug] ?? 3.5;
}

export const RACKET_CATEGORY_DEFS: Array<{
  slug: RacketOrdinalSlug;
  name: string;
  skillBand: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  sortOrder: number;
}> = [
  { slug: '8va', name: '8va', skillBand: 'BASIC', sortOrder: 8 },
  { slug: '7ma', name: '7ma', skillBand: 'BASIC', sortOrder: 7 },
  { slug: '6ta', name: '6ta', skillBand: 'INTERMEDIATE', sortOrder: 6 },
  { slug: '5ta', name: '5ta', skillBand: 'INTERMEDIATE', sortOrder: 5 },
  { slug: '4ta', name: '4ta', skillBand: 'INTERMEDIATE', sortOrder: 4 },
  { slug: '3ra', name: '3ra', skillBand: 'ADVANCED', sortOrder: 3 },
  { slug: '2da', name: '2da', skillBand: 'ADVANCED', sortOrder: 2 },
  { slug: '1ra', name: '1ra', skillBand: 'ADVANCED', sortOrder: 1 },
];
