import type { PlayerProfileRepository } from '../../domain/ports/player_profile_repository.js';

export class GetPlayerProfileUseCase {
  constructor(private readonly _playerProfileRepository: PlayerProfileRepository) {}

  async executeSV(_userId: string) {
    const PROFILE = await this._playerProfileRepository.findByUserIdSV(_userId);
    return (
      PROFILE ?? {
        userId: _userId,
        dominantHand: 'RIGHT' as const,
        sidePreference: 'ANY' as const,
        birthYear: null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      }
    );
  }
}

