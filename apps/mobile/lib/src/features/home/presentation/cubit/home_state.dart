import 'package:equatable/equatable.dart';

import '../../../matches/data/models/open_match_dto.dart';

sealed class HomeState extends Equatable {
  const HomeState();

  @override
  List<Object?> get props => [];
}

final class HomeInitial extends HomeState {
  const HomeInitial();
}

final class HomeLoading extends HomeState {
  const HomeLoading();
}

final class HomeLoaded extends HomeState {
  const HomeLoaded({
    required this.greetingName,
    required this.sportId,
    required this.openMatches,
  });

  final String greetingName;
  final String sportId;
  final List<OpenMatchDto> openMatches;

  OpenMatchDto? get nextMatch =>
      openMatches.isEmpty ? null : openMatches.first;

  @override
  List<Object?> get props => [greetingName, sportId, openMatches];
}

final class HomeFailure extends HomeState {
  const HomeFailure({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}
