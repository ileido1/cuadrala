import type { PlayerProfileRepository } from '../../domain/ports/player_profile_repository.js';
import type { PlayerSportProfileRepository } from '../../domain/ports/player_sport_profile_repository.js';
import type { UserAvailabilityRepository } from '../../domain/ports/user_availability_repository.js';
import type { UserLocationRepository } from '../../domain/ports/user_location_repository.js';

export type OnboardingStepKey =
  | 'identity'
  | 'sports'
  | 'sport_profiles'
  | 'location'
  | 'availability';

export type OnboardingStatusDTO = {
  completedSteps: OnboardingStepKey[];
  pendingSteps: OnboardingStepKey[];
  isComplete: boolean;
  completedAt: Date | null;
};

const ALL_STEPS: OnboardingStepKey[] = [
  'identity',
  'sports',
  'sport_profiles',
  'location',
  'availability',
];

export class GetMyOnboardingStatusUseCase {
  public constructor(
    private readonly _profileRepo: PlayerProfileRepository,
    private readonly _sportProfilesRepo: PlayerSportProfileRepository,
    private readonly _locationRepo: UserLocationRepository,
    private readonly _availabilityRepo: UserAvailabilityRepository,
  ) {}

  async executeSV(_userId: string): Promise<OnboardingStatusDTO> {
    const [PROFILE, SPORTS, LOCATION, AVAILABILITY] = await Promise.all([
      this._profileRepo.findByUserIdSV(_userId),
      this._sportProfilesRepo.listByUserIdSV(_userId),
      this._locationRepo.findByUserIdSV(_userId),
      this._availabilityRepo.listByUserIdSV(_userId),
    ]);

    const COMPLETED: OnboardingStepKey[] = [];
    if (PROFILE !== null && PROFILE.phone !== null && PROFILE.birthYear !== null) {
      COMPLETED.push('identity');
    }
    if (SPORTS.length > 0) {
      COMPLETED.push('sports');
      // Mismo set: la app pide sport_profiles a la vez que sports.
      COMPLETED.push('sport_profiles');
    }
    if (LOCATION !== null) COMPLETED.push('location');
    if (AVAILABILITY.length > 0) COMPLETED.push('availability');

    const PENDING = ALL_STEPS.filter((_s) => !COMPLETED.includes(_s));
    const IS_COMPLETE = PENDING.length === 0;

    return {
      completedSteps: COMPLETED,
      pendingSteps: PENDING,
      isComplete: IS_COMPLETE,
      completedAt: PROFILE?.onboardingCompletedAt ?? null,
    };
  }
}
