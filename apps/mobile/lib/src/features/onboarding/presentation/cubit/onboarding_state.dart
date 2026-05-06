import 'package:equatable/equatable.dart';

import '../../data/models/onboarding_status_dto.dart';

enum OnboardingStatusType { initial, loading, loaded, error }

final class OnboardingState extends Equatable {
  const OnboardingState({
    required this.type,
    this.status,
    this.errorMessage,
    this.savingStep,
  });

  factory OnboardingState.initial() => const OnboardingState(type: OnboardingStatusType.initial);

  final OnboardingStatusType type;
  final OnboardingStatusDto? status;
  final String? errorMessage;
  /// Paso que se está persistiendo (no bloquea, solo indica feedback).
  final OnboardingStep? savingStep;

  OnboardingState copyWith({
    OnboardingStatusType? type,
    OnboardingStatusDto? status,
    String? errorMessage,
    OnboardingStep? savingStep,
    bool clearSaving = false,
    bool clearError = false,
  }) {
    return OnboardingState(
      type: type ?? this.type,
      status: status ?? this.status,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      savingStep: clearSaving ? null : savingStep ?? this.savingStep,
    );
  }

  @override
  List<Object?> get props => [type, status, errorMessage, savingStep];
}
