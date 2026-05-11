import '../../onboarding/data/models/user_availability_dto.dart';
import '../../onboarding/data/onboarding_repository.dart';

/// Repositorio de disponibilidad que delega al OnboardingRepository.
/// Se extrae como clase separada para mantener la puerta abierta a una
/// implementación propia sin acoplamiento a onboarding.
class AvailabilityRepository {
  AvailabilityRepository({required OnboardingRepository onboarding})
      : _onboarding = onboarding;

  final OnboardingRepository _onboarding;

  Future<List<UserAvailabilityDto>> listAvailability() {
    return _onboarding.listAvailability();
  }

  Future<List<UserAvailabilityDto>> putAvailability(List<UserAvailabilityDto> items) {
    return _onboarding.putAvailability(items);
  }
}
