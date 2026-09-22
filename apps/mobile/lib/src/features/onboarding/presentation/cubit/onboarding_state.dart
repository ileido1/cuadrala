import 'package:equatable/equatable.dart';

import '../../../../core/location/location_service.dart';
import '../../data/models/onboarding_status_dto.dart';

enum OnboardingStatusType { initial, loading, loaded, error }

enum OnboardingLocationDetectionStatus { initial, detecting, success, failure }

final class OnboardingState extends Equatable {
  const OnboardingState({
    required this.type,
    this.status,
    this.errorMessage,
    this.savingStep,
    this.locationDetectionStatus = OnboardingLocationDetectionStatus.initial,
    this.detectedLocation,
    this.locationFailure,
  });

  factory OnboardingState.initial() =>
      const OnboardingState(type: OnboardingStatusType.initial);

  final OnboardingStatusType type;
  final OnboardingStatusDto? status;
  final String? errorMessage;

  /// Paso que se está persistiendo (no bloquea, solo indica feedback).
  final OnboardingStep? savingStep;
  final OnboardingLocationDetectionStatus locationDetectionStatus;
  final DeviceLocation? detectedLocation;
  final LocationFailure? locationFailure;

  OnboardingState copyWith({
    OnboardingStatusType? type,
    OnboardingStatusDto? status,
    String? errorMessage,
    OnboardingStep? savingStep,
    OnboardingLocationDetectionStatus? locationDetectionStatus,
    DeviceLocation? detectedLocation,
    LocationFailure? locationFailure,
    bool clearSaving = false,
    bool clearError = false,
    bool clearDetectedLocation = false,
    bool clearLocationFailure = false,
  }) {
    return OnboardingState(
      type: type ?? this.type,
      status: status ?? this.status,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      savingStep: clearSaving ? null : savingStep ?? this.savingStep,
      locationDetectionStatus:
          locationDetectionStatus ?? this.locationDetectionStatus,
      detectedLocation: clearDetectedLocation
          ? null
          : detectedLocation ?? this.detectedLocation,
      locationFailure: clearLocationFailure
          ? null
          : locationFailure ?? this.locationFailure,
    );
  }

  @override
  List<Object?> get props => [
    type,
    status,
    errorMessage,
    savingStep,
    locationDetectionStatus,
    detectedLocation,
    locationFailure,
  ];
}
