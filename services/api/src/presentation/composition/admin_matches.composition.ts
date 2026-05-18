import { PrismaMatchCrudRepository } from '../../infrastructure/adapters/prisma_match_crud_repository.js';
import { PrismaMatchQueryRepository } from '../../infrastructure/adapters/prisma_match_query_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';

export const ADMIN_MATCH_QUERY_REPOSITORY = new PrismaMatchQueryRepository(PRISMA);
export const ADMIN_MATCH_CRUD_REPOSITORY = new PrismaMatchCrudRepository();

