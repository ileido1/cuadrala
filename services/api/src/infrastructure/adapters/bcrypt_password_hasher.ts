import bcrypt from 'bcryptjs';

import type { PasswordHasher } from '../../domain/ports/password_hasher.js';

const BCRYPT_ROUNDS = 10;

export class BcryptPasswordHasher implements PasswordHasher {
  async hashSV(_plainPassword: string): Promise<string> {
    return bcrypt.hash(_plainPassword, BCRYPT_ROUNDS);
  }

  async compareSV(_plainPassword: string, _passwordHash: string): Promise<boolean> {
    return bcrypt.compare(_plainPassword, _passwordHash);
  }
}

