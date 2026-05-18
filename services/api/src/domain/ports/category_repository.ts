export type CategoryDTO = {
  id: string;
  sportId: string;
  name: string;
  slug: string;
  scheme: 'RACKET_ORDINAL' | 'TEAM_SKILL';
  skillBand: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | null;
  sortOrder: number;
};

export interface CategoryRepository {
  findByIdSV(_id: string): Promise<CategoryDTO | null>;
  findAllSV(): Promise<CategoryDTO[]>;
  findAllBySportIdSV(_sportId: string): Promise<CategoryDTO[]>;
  findByIdAndSportIdSV(_id: string, _sportId: string): Promise<CategoryDTO | null>;
}

