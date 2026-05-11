import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/onboarding/data/models/onboarding_status_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/user_availability_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_cubit.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_state.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

class _MockOnboardingRepository extends Mock implements OnboardingRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

void main() {
  group('OnboardingCubit — completion flow', () {
    late OnboardingRepository repository;
    late ProfileRepository profileRepository;

    setUp(() {
      repository = _MockOnboardingRepository();
      profileRepository = _MockProfileRepository();

      // Default: onboarding NOT complete yet
      when(() => repository.getStatus()).thenAnswer(
        (_) async => const OnboardingStatusDto(
          completedSteps: [],
          pendingSteps: [
            OnboardingStep.identity,
            OnboardingStep.sports,
            OnboardingStep.sportProfiles,
            OnboardingStep.location,
            OnboardingStep.availability,
          ],
          isComplete: false,
          completedAt: null,
        ),
      );
    });

    blocTest<OnboardingCubit, OnboardingState>(
      'saveAvailability should call repository.completeOnboarding after saving '
      'so the last onboarding page triggers completion',
      build: () {
        when(() => repository.putAvailability(any()))
            .thenAnswer((_) async => <UserAvailabilityDto>[]);
        return OnboardingCubit(
          repository: repository,
          profileRepository: profileRepository,
        );
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.saveAvailability([]);
      },
      verify: (_) {
        // After saving availability (last step), completeOnboarding should be called
        verify(() => repository.completeOnboarding()).called(1);
      },
    );

    blocTest<OnboardingCubit, OnboardingState>(
      'saveAvailability does NOT call completeOnboarding when onboarding is '
      'already complete (user returned to finish pending steps)',
      build: () {
        when(() => repository.putAvailability(any()))
            .thenAnswer((_) async => <UserAvailabilityDto>[]);
        // Simulate: onboarding already complete
        when(() => repository.getStatus()).thenAnswer(
          (_) async => const OnboardingStatusDto(
            completedSteps: [
              OnboardingStep.identity,
              OnboardingStep.sports,
              OnboardingStep.sportProfiles,
              OnboardingStep.location,
              OnboardingStep.availability,
            ],
            pendingSteps: [],
            isComplete: true,
            completedAt: null,
          ),
        );
        return OnboardingCubit(
          repository: repository,
          profileRepository: profileRepository,
        );
      },
      seed: () => OnboardingState.initial().copyWith(
        type: OnboardingStatusType.loaded,
        status: const OnboardingStatusDto(
          completedSteps: [
            OnboardingStep.identity,
            OnboardingStep.sports,
            OnboardingStep.sportProfiles,
            OnboardingStep.location,
            OnboardingStep.availability,
          ],
          pendingSteps: [],
          isComplete: true,
          completedAt: null,
        ),
      ),
      act: (cubit) async {
        await cubit.load();
        await cubit.saveAvailability([]);
      },
      verify: (_) {
        // No completion call needed — onboarding already done
        verifyNever(() => repository.completeOnboarding());
      },
    );
  });
}
