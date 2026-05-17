import { SearchUsersByDocumentUseCase } from '../../application/use_cases/search_users_by_document.use_case.js';
import { PrismaUserRepository } from '../../infrastructure/adapters/prisma_user_repository.js';

const USER_REPOSITORY = new PrismaUserRepository();

export const SEARCH_USERS_BY_DOCUMENT_UC = new SearchUsersByDocumentUseCase(USER_REPOSITORY);
