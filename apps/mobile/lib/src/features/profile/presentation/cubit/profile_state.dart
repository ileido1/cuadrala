import 'package:equatable/equatable.dart';

import '../../../catalog/data/models/sport_dto.dart';
import '../../../onboarding/data/models/onboarding_status_dto.dart';
import '../../../onboarding/data/models/player_sport_profile_dto.dart';
import '../../../onboarding/data/models/user_availability_dto.dart';
import '../../../onboarding/data/models/user_location_dto.dart';
import '../../data/models/leaderboard_entry_dto.dart';
import '../../data/models/player_profile_dto.dart';
import '../../data/models/user_me_dto.dart';
import '../../data/models/user_rating_dto.dart';
import '../../data/models/user_stats_dto.dart';

sealed class ProfileState extends Equatable {
  const ProfileState();

  @override
  List<Object?> get props => [];
}

final class ProfileInitial extends ProfileState {
  const ProfileInitial();
}

final class ProfileLoading extends ProfileState {
  const ProfileLoading();
}

final class ProfileLoaded extends ProfileState {
  const ProfileLoaded({
    required this.me,
    required this.stats,
    required this.ratings,
    required this.history,
    required this.playerProfile,
    required this.onboardingStatus,
    required this.sportProfiles,
    required this.location,
    required this.availability,
    required this.sports,
    this.leaderboard = const [],
  });

  final UserMeDto me;
  final UserStatsDto stats;
  final List<UserRatingDto> ratings;
  final List<UserRatingHistoryItemDto> history;
  final PlayerProfileDto playerProfile;
  final OnboardingStatusDto onboardingStatus;
  final List<PlayerSportProfileDto> sportProfiles;
  final UserLocationDto? location;
  final List<UserAvailabilityDto> availability;
  final List<SportDto> sports;
  final List<LeaderboardEntryDto> leaderboard;

  @override
  List<Object?> get props => [
        me,
        stats,
        ratings,
        history,
        playerProfile,
        onboardingStatus,
        sportProfiles,
        location,
        availability,
        sports,
        leaderboard,
      ];
}

final class ProfileFailure extends ProfileState {
  const ProfileFailure({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}
