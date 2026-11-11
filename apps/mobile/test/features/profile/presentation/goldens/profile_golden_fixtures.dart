import 'package:cuadrala_mobile/src/features/catalog/data/models/sport_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/onboarding_status_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/player_sport_profile_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/user_availability_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/user_location_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/leaderboard_entry_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/player_profile_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_rating_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_stats_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/presentation/cubit/profile_state.dart';

//? Fixture compartido por los goldens del módulo profile: un jugador con
//? ratings, historial ELO, deportes y disponibilidad. Fechas fijas para que
//? los PNG sean deterministas. Sin avatarUrl: Image.network no carga en tests.
final profileGoldenLoaded = ProfileLoaded(
  me: const UserMeDto(
    id: 'me-id',
    email: 'ana@cuadrala.test',
    name: 'Ana Rodríguez',
    subscriptionType: 'FREE',
  ),
  stats: const UserStatsDto(
    userId: 'me-id',
    matchesPlayed: 24,
    matchesWon: 15,
    matchesLost: 9,
    winRate: 0.625,
  ),
  ratings: [
    UserRatingDto(
      categoryId: 'cat-4',
      rating: 1432,
      points: 180,
      updatedAt: DateTime(2030, 5, 30),
      categoryName: '4ta',
      sportId: 'sport-padel',
    ),
  ],
  history: [
    for (var i = 0; i < 6; i++)
      UserRatingHistoryItemDto(
        matchId: 'match-$i',
        resultId: 'result-$i',
        previousRating: 1380 + i * 10.0,
        newRating: 1380 + (i + 1) * 10.0 - (i.isOdd ? 18 : 0),
        kFactor: 32,
        createdAt: DateTime(2030, 5, 1 + i * 5, 20),
      ),
  ],
  playerProfile: const PlayerProfileDto(dominantHand: 'RIGHT'),
  onboardingStatus: const OnboardingStatusDto(
    completedSteps: [],
    pendingSteps: [],
    isComplete: true,
    completedAt: null,
  ),
  sportProfiles: const [
    PlayerSportProfileDto(
      id: 'psp-1',
      sportId: 'sport-padel',
      skillLevel: 4,
      sidePreference: SidePreference.right,
      categoryId: 'cat-4',
      categoryName: '4ta',
    ),
  ],
  location: const UserLocationDto(
    label: 'Las Mercedes, Caracas',
    latitude: 10.48,
    longitude: -66.86,
    radiusKm: 10,
  ),
  availability: const [
    UserAvailabilityDto(
      dayOfWeek: DayOfWeek.monday,
      slot: AvailabilitySlot.evening,
    ),
    UserAvailabilityDto(
      dayOfWeek: DayOfWeek.wednesday,
      slot: AvailabilitySlot.evening,
    ),
    UserAvailabilityDto(
      dayOfWeek: DayOfWeek.saturday,
      slot: AvailabilitySlot.morning,
    ),
  ],
  sports: const [SportDto(id: 'sport-padel', code: 'PADEL', name: 'Pádel')],
  leaderboard: const [
    LeaderboardEntryDto(
      rank: 1,
      userId: 'u-1',
      displayName: 'Carlos Pérez',
      rating: 1510,
    ),
    LeaderboardEntryDto(
      rank: 2,
      userId: 'me-id',
      displayName: 'Ana Rodríguez',
      rating: 1432,
    ),
  ],
);
