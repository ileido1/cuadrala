import '../../../core/failures/app_failure.dart';
import 'models/onboarding_status_dto.dart';
import 'models/player_sport_profile_dto.dart';
import 'models/user_availability_dto.dart';
import 'models/user_location_dto.dart';
import 'onboarding_api.dart';

class OnboardingRepository {
  OnboardingRepository({required OnboardingApi api}) : _api = api;

  final OnboardingApi _api;

  Future<OnboardingStatusDto> getStatus() async {
    final data = await _api.getOnboardingStatusEnvelope();
    return OnboardingStatusDto.fromJson(data);
  }

  Future<List<PlayerSportProfileDto>> listSportProfiles() async {
    final data = await _api.getSportProfilesEnvelope();
    final raw = data['items'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, Object?>>()
        .map(PlayerSportProfileDto.fromJson)
        .toList();
  }

  Future<List<PlayerSportProfileDto>> putSportProfiles(
    List<({String sportId, double skillLevel, SidePreference sidePreference})> items,
  ) async {
    final body = {
      'items': items
          .map(
            (i) => {
              'sportId': i.sportId,
              'skillLevel': i.skillLevel,
              'sidePreference': sidePreferenceToWire(i.sidePreference),
            },
          )
          .toList(),
    };
    final json = await _api.putSportProfilesEnvelope(body: body);
    final data = json['data'];
    if (data is! Map<String, Object?>) {
      throw const AppFailure(code: 'INVALID_RESPONSE', message: 'Respuesta inválida del servidor.');
    }
    final raw = data['items'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, Object?>>()
        .map(PlayerSportProfileDto.fromJson)
        .toList();
  }

  Future<List<UserAvailabilityDto>> listAvailability() async {
    final data = await _api.getAvailabilityEnvelope();
    final raw = data['items'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, Object?>>()
        .map(UserAvailabilityDto.fromJson)
        .toList();
  }

  Future<List<UserAvailabilityDto>> putAvailability(List<UserAvailabilityDto> items) async {
    final body = {'items': items.map((i) => i.toWireJson()).toList()};
    final json = await _api.putAvailabilityEnvelope(body: body);
    final data = json['data'];
    if (data is! Map<String, Object?>) {
      throw const AppFailure(code: 'INVALID_RESPONSE', message: 'Respuesta inválida del servidor.');
    }
    final raw = data['items'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, Object?>>()
        .map(UserAvailabilityDto.fromJson)
        .toList();
  }

  Future<UserLocationDto?> getLocation() async {
    final data = await _api.getLocationEnvelope();
    final raw = data['location'];
    if (raw is! Map<String, Object?>) return null;
    return UserLocationDto.fromJson(raw);
  }

  Future<UserLocationDto> putLocation({
    String? label,
    required double latitude,
    required double longitude,
    required int radiusKm,
  }) async {
    final body = <String, Object?>{
      if (label != null) 'label': label,
      'latitude': latitude,
      'longitude': longitude,
      'radiusKm': radiusKm,
    };
    final json = await _api.putLocationEnvelope(body: body);
    final data = json['data'];
    if (data is! Map<String, Object?>) {
      throw const AppFailure(code: 'INVALID_RESPONSE', message: 'Respuesta inválida del servidor.');
    }
    final raw = data['location'];
    if (raw is! Map<String, Object?>) {
      throw const AppFailure(code: 'INVALID_RESPONSE', message: 'Respuesta inválida del servidor.');
    }
    return UserLocationDto.fromJson(raw);
  }

  Future<void> patchIdentity({
    String? phone,
    int? birthYear,
    DateTime? birthDate,
    String? city,
    String? avatarUrl,
  }) async {
    final body = <String, Object?>{};
    if (phone != null) body['phone'] = phone;
    if (birthYear != null) body['birthYear'] = birthYear;
    if (birthDate != null) {
      body['birthDate'] =
          '${birthDate.year.toString().padLeft(4, '0')}-${birthDate.month.toString().padLeft(2, '0')}-${birthDate.day.toString().padLeft(2, '0')}';
    }
    if (city != null) body['city'] = city;
    if (avatarUrl != null) body['avatarUrl'] = avatarUrl;
    if (body.isEmpty) return;
    await _api.patchPlayerProfileEnvelope(body: body);
  }
}
