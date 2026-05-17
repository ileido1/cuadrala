import type {
  UserDocumentSearchResultDTO,
  UserRepository,
} from '../../domain/ports/user_repository.js';

export class SearchUsersByDocumentUseCase {
  constructor(private readonly _userRepository: UserRepository) {}

  async executeSV(_documentNumber: string): Promise<UserDocumentSearchResultDTO[]> {
    return this._userRepository.findByDocumentNumberSV(_documentNumber);
  }
}
