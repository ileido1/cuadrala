export interface PasswordHasher {
  hashSV(_plainPassword: string): Promise<string>;
  compareSV(_plainPassword: string, _passwordHash: string): Promise<boolean>;
}

