export type SportDTO = {
  id: string;
  code: string;
  name: string;
};

export interface SportRepository {
  listSportsSV(): Promise<SportDTO[]>;
  findByIdSV(_id: string): Promise<SportDTO | null>;
}

