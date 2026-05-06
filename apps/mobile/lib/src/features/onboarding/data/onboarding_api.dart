import '../../../core/network/api_client.dart';

abstract interface class OnboardingApi {
  Future<Map<String, Object?>> getOnboardingStatusEnvelope();

  Future<Map<String, Object?>> getSportProfilesEnvelope();
  Future<Map<String, Object?>> putSportProfilesEnvelope({required Object body});

  Future<Map<String, Object?>> getAvailabilityEnvelope();
  Future<Map<String, Object?>> putAvailabilityEnvelope({required Object body});

  Future<Map<String, Object?>> getLocationEnvelope();
  Future<Map<String, Object?>> putLocationEnvelope({required Object body});

  Future<Map<String, Object?>> patchPlayerProfileEnvelope({required Object body});
}

final class DioOnboardingApi implements OnboardingApi {
  const DioOnboardingApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> getOnboardingStatusEnvelope() {
    return _apiClient.getEnvelopeDataMap('/api/v1/users/me/onboarding-status');
  }

  @override
  Future<Map<String, Object?>> getSportProfilesEnvelope() {
    return _apiClient.getEnvelopeDataMap('/api/v1/users/me/sport-profiles');
  }

  @override
  Future<Map<String, Object?>> putSportProfilesEnvelope({required Object body}) {
    return _apiClient.putJson('/api/v1/users/me/sport-profiles', body: body);
  }

  @override
  Future<Map<String, Object?>> getAvailabilityEnvelope() {
    return _apiClient.getEnvelopeDataMap('/api/v1/users/me/availability');
  }

  @override
  Future<Map<String, Object?>> putAvailabilityEnvelope({required Object body}) {
    return _apiClient.putJson('/api/v1/users/me/availability', body: body);
  }

  @override
  Future<Map<String, Object?>> getLocationEnvelope() {
    return _apiClient.getEnvelopeDataMap('/api/v1/users/me/location');
  }

  @override
  Future<Map<String, Object?>> putLocationEnvelope({required Object body}) {
    return _apiClient.putJson('/api/v1/users/me/location', body: body);
  }

  @override
  Future<Map<String, Object?>> patchPlayerProfileEnvelope({required Object body}) {
    return _apiClient.patchJson('/api/v1/users/me/profile', body: body);
  }
}
