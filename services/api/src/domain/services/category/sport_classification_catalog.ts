/** Deportes con categorías ordinales 8va–1ra. */
export const RACKET_SPORT_CODES = ['PADEL', 'TENNIS', 'PICKLEBALL'] as const;

/** Deportes con 3 tiers: Recreativo / Intermedio / Competitivo. */
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

export function isRacketSportCodeSV(_code: string): boolean {
  return (RACKET_SPORT_CODES as readonly string[]).includes(_code.toUpperCase());
}

export function isTeamSportCodeSV(_code: string): boolean {
  return (TEAM_SPORT_CODES as readonly string[]).includes(_code.toUpperCase());
}

/** skillLevel autodeclarado alineado a categoría (escala 1.0–7.0). */
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

export const TEAM_CATEGORY_DEFS: Array<{
  slug: TeamTierSlug;
  name: string;
  skillBand: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  sortOrder: number;
}> = [
  { slug: 'recreativo', name: 'Recreativo', skillBand: 'BASIC', sortOrder: 1 },
  { slug: 'intermedio', name: 'Intermedio', skillBand: 'INTERMEDIATE', sortOrder: 2 },
  { slug: 'competitivo', name: 'Competitivo', skillBand: 'ADVANCED', sortOrder: 3 },
];
