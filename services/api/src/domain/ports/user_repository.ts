export type UserDTO = {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  subscriptionType: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UserDocumentSearchResultDTO = {
  id: string;
  name: string;
  email: string;
  documentNumber: string | null;
};

export interface UserRepository {
  findByIdSV(_id: string): Promise<UserDTO | null>;
  findByEmailSV(_emailLower: string): Promise<UserDTO | null>;
  createUserSV(_data: {
    emailLower: string;
    name: string;
    passwordHash: string | null;
  }): Promise<UserDTO>;
  /** Vincula inscripciones de invitado al crear una cuenta con el mismo correo. */
  claimGuestTournamentRegistrationsByEmailSV?(_emailLower: string, _userId: string): Promise<number>;
  updateUserNameSV(_id: string, _name: string): Promise<UserDTO>;

  /** Conteo de usuarios existentes por IDs (validación de input). */
  countByIdsSV(_ids: string[]): Promise<number>;

  findByDocumentNumberSV(_documentNumber: string): Promise<UserDocumentSearchResultDTO[]>;
}
