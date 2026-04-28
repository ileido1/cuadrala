import type { UserDTO, UserRepository } from '../../domain/ports/user_repository.js';

import { PRISMA } from '../prisma_client.js';

function mapUser(_row: {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  subscriptionType: string;
  createdAt: Date;
  updatedAt: Date;
}): UserDTO {
  return {
    id: _row.id,
    email: _row.email,
    name: _row.name,
    passwordHash: _row.passwordHash,
    subscriptionType: _row.subscriptionType,
    createdAt: _row.createdAt,
    updatedAt: _row.updatedAt,
  };
}

export class PrismaUserRepository implements UserRepository {
  async findByIdSV(_id: string): Promise<UserDTO | null> {
    const ROW = await PRISMA.user.findUnique({ where: { id: _id } });
    return ROW === null ? null : mapUser(ROW);
  }

  async findByEmailSV(_emailLower: string): Promise<UserDTO | null> {
    const ROW = await PRISMA.user.findUnique({ where: { email: _emailLower } });
    return ROW === null ? null : mapUser(ROW);
  }

  async createUserSV(_data: {
    emailLower: string;
    name: string;
    passwordHash: string;
  }): Promise<UserDTO> {
    const ROW = await PRISMA.user.create({
      data: {
        email: _data.emailLower,
        name: _data.name.trim(),
        passwordHash: _data.passwordHash,
      },
    });
    return mapUser(ROW);
  }

  async updateUserNameSV(_id: string, _name: string): Promise<UserDTO> {
    const ROW = await PRISMA.user.update({
      where: { id: _id },
      data: { name: _name.trim() },
    });
    return mapUser(ROW);
  }

  async countByIdsSV(_ids: string[]): Promise<number> {
    return PRISMA.user.count({ where: { id: { in: _ids } } });
  }
}

