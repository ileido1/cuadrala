import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/location/location_service.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/onboarding_status_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_cubit.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_state.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

class _MockOnboardingRepository extends Mock implements OnboardingRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockLocationService extends Mock implements LocationService {}

void main() {
  group('OnboardingCubit', () {
    late OnboardingRepository repository;
    late ProfileRepository profileRepository;
    late LocationService locationService;

    setUp(() {
      repository = _MockOnboardingRepository();
      profileRepository = _MockProfileRepository();
      locationService = _MockLocationService();
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
      'detectLocation requests once and exposes granted coordinates',
      build: () {
        when(() => locationService.getCurrentLocation()).thenAnswer(
          (_) async =>
              const DeviceLocation(latitude: 10.4806, longitude: -66.9036),
        );
        return OnboardingCubit(
          repository: repository,
          profileRepository: profileRepository,
          locationService: locationService,
        );
      },
      act: (cubit) async {
        await cubit.detectLocation();
        await cubit.detectLocation();
      },
      verify: (cubit) {
        verify(() => locationService.getCurrentLocation()).called(1);
        expect(
          cubit.state.locationDetectionStatus,
          OnboardingLocationDetectionStatus.success,
        );
        expect(cubit.state.detectedLocation?.latitude, 10.4806);
        expect(cubit.state.detectedLocation?.longitude, -66.9036);
      },
    );

    for (final failure in const [
      LocationFailure(code: 'LOCATION_DISABLED', message: 'Activa el GPS.'),
      LocationFailure(code: 'LOCATION_DENIED', message: 'Permiso denegado.'),
      LocationFailure(
        code: 'LOCATION_DENIED_FOREVER',
        message: 'Permiso denegado permanentemente.',
      ),
      LocationFailure(
        code: 'LOCATION_UNAVAILABLE',
        message: 'Ubicacion no disponible.',
      ),
    ]) {
      blocTest<OnboardingCubit, OnboardingState>(
        'detectLocation preserves ${failure.code} and allows explicit retry',
        build: () {
          when(() => locationService.getCurrentLocation()).thenThrow(failure);
          return OnboardingCubit(
            repository: repository,
            profileRepository: profileRepository,
            locationService: locationService,
          );
        },
        act: (cubit) async {
          await cubit.detectLocation();
          await cubit.detectLocation();
          await cubit.detectLocation(retry: true);
        },
        verify: (cubit) {
          verify(() => locationService.getCurrentLocation()).called(2);
          expect(
            cubit.state.locationDetectionStatus,
            OnboardingLocationDetectionStatus.failure,
          );
          expect(cubit.state.locationFailure, failure);
          expect(cubit.state.detectedLocation, isNull);
        },
      );
    }

    blocTest<OnboardingCubit, OnboardingState>(
      'detectLocation converts unexpected API errors into manual fallback',
      build: () {
        when(
          () => locationService.getCurrentLocation(),
        ).thenThrow(Exception('platform API failed'));
        return OnboardingCubit(
          repository: repository,
          profileRepository: profileRepository,
          locationService: locationService,
        );
      },
      act: (cubit) => cubit.detectLocation(),
      verify: (cubit) {
        expect(cubit.state.locationFailure?.code, 'LOCATION_UNAVAILABLE');
        expect(cubit.state.locationFailure?.message, contains('manualmente'));
      },
    );

    blocTest<OnboardingCubit, OnboardingState>(
      'detectLocation reports unavailable when no location service is injected',
      build: () => OnboardingCubit(
        repository: repository,
        profileRepository: profileRepository,
      ),
      act: (cubit) => cubit.detectLocation(),
      verify: (cubit) {
        expect(cubit.state.locationFailure?.code, 'LOCATION_UNAVAILABLE');
        expect(cubit.state.locationFailure?.message, contains('manualmente'));
        expect(
          cubit.state.locationDetectionStatus,
          OnboardingLocationDetectionStatus.failure,
        );
      },
    );

    blocTest<OnboardingCubit, OnboardingState>(
      'saveIdentity llama al repo y refresca el status',
      build: () {
        when(
          () => repository.patchIdentity(
            phone: any(named: 'phone'),
            birthYear: any(named: 'birthYear'),
            city: any(named: 'city'),
            avatarUrl: any(named: 'avatarUrl'),
          ),
        ).thenAnswer((_) async {});
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
      act: (cubit) =>
          cubit.saveIdentity(phone: '+584125551234', birthYear: 1990),
      verify: (cubit) {
        verify(
          () => repository.patchIdentity(
            phone: '+584125551234',
            birthYear: 1990,
            city: null,
            avatarUrl: null,
          ),
        ).called(1);
        expect(
          cubit.state.status?.completedSteps,
          contains(OnboardingStep.identity),
        );
        expect(cubit.state.savingStep, isNull);
      },
    );
  });
}
