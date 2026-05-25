import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../catalog/data/catalog_repository.dart';
import '../../../catalog/data/models/sport_dto.dart';
import '../../../onboarding/data/models/onboarding_status_dto.dart';
import '../../../onboarding/data/models/player_sport_profile_dto.dart';
import '../../../onboarding/data/models/user_availability_dto.dart';
import '../../../onboarding/data/models/user_location_dto.dart';
import '../../../onboarding/data/onboarding_repository.dart';
import '../../data/models/leaderboard_entry_dto.dart';
import '../../data/models/player_profile_dto.dart';
import '../../data/models/user_rating_dto.dart';
import '../../data/models/user_stats_dto.dart';
import '../../data/profile_repository.dart';
import 'profile_state.dart';

class ProfileCubit extends Cubit<ProfileState> {
  ProfileCubit({
    required ProfileRepository profileRepository,
    required OnboardingRepository onboardingRepository,
    required CatalogRepository catalogRepository,
  })  : _profileRepository = profileRepository,
        _onboardingRepository = onboardingRepository,
        _catalogRepository = catalogRepository,
        super(const ProfileInitial());

  final ProfileRepository _profileRepository;
  final OnboardingRepository _onboardingRepository;
  final CatalogRepository _catalogRepository;

  Future<void> load() async {
    emit(const ProfileLoading());
    try {
      final me = await _profileRepository.getMe();
      final results = await Future.wait([
        _profileRepository.getUserStats(me.id),
        _profileRepository.getUserRatings(userId: me.id),
        _profileRepository.getUserRatingHistory(userId: me.id, limit: 10),
        _profileRepository.getPlayerProfile(),
        _onboardingRepository.getStatus(),
        _onboardingRepository.listSportProfiles(),
        _onboardingRepository.getLocation(),
        _onboardingRepository.listAvailability(),
        _catalogRepository.listSports(),
      ]);
      final ratings = results[1] as List<UserRatingDto>;

      var leaderboard = <LeaderboardEntryDto>[];
      if (ratings.isNotEmpty) {
        try {
          leaderboard =
              await _profileRepository.getLeaderboard(ratings.first.categoryId);
        } catch (e) {
          debugPrint('[ProfileCubit] leaderboard fetch failed: $e');
        }
      }

      emit(ProfileLoaded(
        me: me,
        stats: results[0] as UserStatsDto,
        ratings: ratings,
        history: results[2] as List<UserRatingHistoryItemDto>,
        playerProfile: results[3] as PlayerProfileDto,
        onboardingStatus: results[4] as OnboardingStatusDto,
        sportProfiles: results[5] as List<PlayerSportProfileDto>,
        location: results[6] as UserLocationDto?,
        availability: results[7] as List<UserAvailabilityDto>,
        sports: results[8] as List<SportDto>,
        leaderboard: leaderboard,
      ));
    } catch (e) {
      final message =
          e is AppFailure ? e.message : 'No se pudo cargar el perfil.';
      emit(ProfileFailure(message: message));
    }
  }
}
