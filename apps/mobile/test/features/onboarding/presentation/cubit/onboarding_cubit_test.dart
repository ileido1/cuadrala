import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/onboarding/data/models/onboarding_status_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_cubit.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_state.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

class _MockOnboardingRepository extends Mock implements OnboardingRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

void main() {
  group('OnboardingCubit', () {
    late OnboardingRepository repository;
    late ProfileRepository profileRepository;

    setUp(() {
      repository = _MockOnboardingRepository();
      profileRepository = _MockProfileRepository();
    });

    blocTest<OnboardingCubit, OnboardingState>(
      'load emite loading→loaded con el estado del repositorio',
      build: () {
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
        return OnboardingCubit(
          repository: repository,
          profileRepository: profileRepository,
        );
      },
      act: (cubit) => cubit.load(),
      verify: (cubit) {
        expect(cubit.state.type, OnboardingStatusType.loaded);
        expect(cubit.state.status?.isComplete, false);
        expect(cubit.state.status?.pendingSteps.length, 5);
      },
    );

    blocTest<OnboardingCubit, OnboardingState>(
      'saveIdentity llama al repo y refresca el status',
      build: () {
        when(() => repository.patchIdentity(
              phone: any(named: 'phone'),
              birthYear: any(named: 'birthYear'),
              city: any(named: 'city'),
              avatarUrl: any(named: 'avatarUrl'),
            )).thenAnswer((_) async {});
        when(() => repository.getStatus()).thenAnswer(
          (_) async => const OnboardingStatusDto(
            completedSteps: [OnboardingStep.identity],
            pendingSteps: [],
            isComplete: false,
            completedAt: null,
          ),
        );
        return OnboardingCubit(
          repository: repository,
          profileRepository: profileRepository,
        );
      },
      act: (cubit) => cubit.saveIdentity(phone: '+584125551234', birthYear: 1990),
      verify: (cubit) {
        verify(() => repository.patchIdentity(
              phone: '+584125551234',
              birthYear: 1990,
              city: null,
              avatarUrl: null,
            )).called(1);
        expect(cubit.state.status?.completedSteps, contains(OnboardingStep.identity));
        expect(cubit.state.savingStep, isNull);
      },
    );
  });
}
