import type { UserRepository } from '../domain/ports/user_repository.js';

import { GetProfileUseCase } from './use_cases/get_profile.use_case.js';
import { UpdateProfileUseCase } from './use_cases/update_profile.use_case.js';

export function buildGetProfileByUserIdSV(_userRepository: UserRepository) {
  const UC = new GetProfileUseCase(_userRepository);
  return UC.executeSV.bind(UC);
}

export function buildUpdateProfileByUserIdSV(_userRepository: UserRepository) {
  const UC = new UpdateProfileUseCase(_userRepository);
  return UC.executeSV.bind(UC);
}
