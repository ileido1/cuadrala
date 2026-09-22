import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../../core/location/location_service.dart';
import '../../../profile/data/profile_repository.dart';
import '../../data/models/onboarding_status_dto.dart';
import '../../data/models/player_sport_profile_dto.dart';
import '../../data/models/user_availability_dto.dart';
import '../../data/onboarding_repository.dart';
import 'onboarding_state.dart';

class OnboardingCubit extends Cubit<OnboardingState> {
  OnboardingCubit({
    required OnboardingRepository repository,
    required ProfileRepository profileRepository,
    LocationService? locationService,
  }) : _repository = repository,
       _profileRepository = profileRepository,
       _locationService = locationService,
       super(OnboardingState.initial());

  final OnboardingRepository _repository;
  final ProfileRepository _profileRepository;
  final LocationService? _locationService;

  Future<void> detectLocation({bool retry = false}) async {
    if (state.locationDetectionStatus ==
        OnboardingLocationDetectionStatus.detecting) {
      return;
    }
    if (!retry &&
        state.locationDetectionStatus !=
            OnboardingLocationDetectionStatus.initial) {
      return;
    }

    final service = _locationService;
    if (service == null) {
      emit(
        state.copyWith(
          locationDetectionStatus: OnboardingLocationDetectionStatus.failure,
          locationFailure: const LocationFailure(
            code: 'LOCATION_UNAVAILABLE',
            message:
                'No pudimos detectar tu ubicación. Puedes ingresar tus coordenadas manualmente.',
          ),
          clearDetectedLocation: true,
        ),
      );
      return;
    }

    emit(
      state.copyWith(
        locationDetectionStatus: OnboardingLocationDetectionStatus.detecting,
        clearDetectedLocation: true,
        clearLocationFailure: true,
      ),
    );
    try {
      final location = await service.getCurrentLocation();
      emit(
        state.copyWith(
          locationDetectionStatus: OnboardingLocationDetectionStatus.success,
          detectedLocation: location,
          clearLocationFailure: true,
        ),
      );
    } on LocationFailure catch (failure) {
      emit(
        state.copyWith(
          locationDetectionStatus: OnboardingLocationDetectionStatus.failure,
          locationFailure: failure,
          clearDetectedLocation: true,
        ),
      );
    } catch (_) {
      emit(
        state.copyWith(
          locationDetectionStatus: OnboardingLocationDetectionStatus.failure,
          locationFailure: const LocationFailure(
            code: 'LOCATION_UNAVAILABLE',
            message:
                'No pudimos detectar tu ubicación. Puedes ingresar tus coordenadas manualmente.',
          ),
          clearDetectedLocation: true,
        ),
      );
    }
  }

  Future<void> load() async {
    emit(state.copyWith(type: OnboardingStatusType.loading, clearError: true));
    try {
      final status = await _repository.getStatus();
      emit(state.copyWith(type: OnboardingStatusType.loaded, status: status));
    } on AppFailure catch (f) {
      emit(
        state.copyWith(
          type: OnboardingStatusType.error,
          errorMessage: f.message,
        ),
      );
    } catch (e) {
      emit(
        state.copyWith(
          type: OnboardingStatusType.error,
          errorMessage: e.toString(),
        ),
      );
    }
  }

  Future<bool> saveIdentity({
    String? name,
    required String phone,
    required int birthYear,
    DateTime? birthDate,
    String? city,
    String? documentNumber,
  }) async {
    emit(state.copyWith(savingStep: OnboardingStep.identity, clearError: true));
    try {
      if (name != null && name.trim().isNotEmpty) {
        await _profileRepository.patchMyName(name.trim());
      }
      await _repository.patchIdentity(
        phone: phone,
        birthYear: birthYear,
        birthDate: birthDate,
        city: city,
        documentNumber: documentNumber,
      );
      await _refreshStatus();
      return true;
    } on AppFailure catch (f) {
      emit(state.copyWith(errorMessage: f.message, clearSaving: true));
      return false;
    } catch (e) {
      emit(state.copyWith(errorMessage: e.toString(), clearSaving: true));
      return false;
    }
  }

  Future<bool> saveSportProfiles({
    required List<
      ({
        String sportId,
        double skillLevel,
        SidePreference sidePreference,
        String? categoryId,
      })
    >
    items,
    String? dominantHand,
  }) async {
    emit(
      state.copyWith(
        savingStep: OnboardingStep.sportProfiles,
        clearError: true,
      ),
    );
    try {
      await _repository.putSportProfiles(items);
      if (dominantHand != null && dominantHand.isNotEmpty) {
        await _repository.patchDominantHand(dominantHand);
      }
      await _refreshStatus();
      return true;
    } on AppFailure catch (f) {
      emit(state.copyWith(errorMessage: f.message, clearSaving: true));
      return false;
    } catch (e) {
      emit(state.copyWith(errorMessage: e.toString(), clearSaving: true));
      return false;
    }
  }

  Future<bool> saveAvailability(List<UserAvailabilityDto> items) async {
    emit(
      state.copyWith(savingStep: OnboardingStep.availability, clearError: true),
    );
    try {
      await _repository.putAvailability(items);
      // Si es el último paso pendiente, marcar onboarding como completo.
      if (state.status != null && !state.status!.isComplete) {
        await _repository.completeOnboarding();
      }
      await _refreshStatus();
      return true;
    } on AppFailure catch (f) {
      emit(state.copyWith(errorMessage: f.message, clearSaving: true));
      return false;
    } catch (e) {
      emit(state.copyWith(errorMessage: e.toString(), clearSaving: true));
      return false;
    }
  }

  Future<bool> saveLocation({
    String? label,
    required double latitude,
    required double longitude,
    required int radiusKm,
  }) async {
    emit(state.copyWith(savingStep: OnboardingStep.location, clearError: true));
    try {
      await _repository.putLocation(
        label: label,
        latitude: latitude,
        longitude: longitude,
        radiusKm: radiusKm,
      );
      await _refreshStatus();
      return true;
    } on AppFailure catch (f) {
      emit(state.copyWith(errorMessage: f.message, clearSaving: true));
      return false;
    } catch (e) {
      emit(state.copyWith(errorMessage: e.toString(), clearSaving: true));
      return false;
    }
  }

  Future<void> _refreshStatus() async {
    final status = await _repository.getStatus();
    emit(
      state.copyWith(
        type: OnboardingStatusType.loaded,
        status: status,
        clearSaving: true,
      ),
    );
  }
}
