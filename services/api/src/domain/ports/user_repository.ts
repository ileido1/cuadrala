export type UserDTO = {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  subscriptionType: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface UserRepository {
  findByIdSV(_id: string): Promise<UserDTO | null>;
  findByEmailSV(_emailLower: string): Promise<UserDTO | null>;
  createUserSV(_data: { emailLower: string; name: string; passwordHash: string }): Promise<UserDTO>;
  updateUserNameSV(_id: string, _name: string): Promise<UserDTO>;

  /** Conteo de usuarios existentes por IDs (validación de input). */
  countByIdsSV(_ids: string[]): Promise<number>;
}

