import { AppError } from '../domain/errors/app_error.js';
import { PRISMA } from '../infrastructure/prisma_client.js';

export async function getProfileByUserIdSV(_userId: string): Promise<{
  id: string;
  email: string;
  name: string;
  subscriptionType: string;
  createdAt: Date;
  updatedAt: Date;
}> {
  const USER = await PRISMA.user.findUnique({ where: { id: _userId } });
  if (USER === null) {
    throw new AppError('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado.', 404);
  }

  return {
    id: USER.id,
    email: USER.email,
    name: USER.name,
    subscriptionType: USER.subscriptionType,
    createdAt: USER.createdAt,
    updatedAt: USER.updatedAt,
  };
}

export async function updateProfileByUserIdSV(
  _userId: string,
  _name: string | undefined,
): Promise<{
  id: string;
  email: string;
  name: string;
  subscriptionType: string;
  createdAt: Date;
  updatedAt: Date;
}> {
  if (_name === undefined) {
    return getProfileByUserIdSV(_userId);
  }

  const USER = await PRISMA.user.update({
    where: { id: _userId },
    data: { name: _name.trim() },
  });

  return {
    id: USER.id,
    email: USER.email,
    name: USER.name,
    subscriptionType: USER.subscriptionType,
    createdAt: USER.createdAt,
    updatedAt: USER.updatedAt,
  };
}
