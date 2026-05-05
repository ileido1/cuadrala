import '../../../core/failures/app_failure.dart';
import 'models/user_me_dto.dart';
import 'profile_api.dart';

class ProfileRepository {
  ProfileRepository({required ProfileApi profileApi}) : _profileApi = profileApi;

  final ProfileApi _profileApi;

  Future<UserMeDto> getMe() async {
    final data = await _profileApi.getMeEnvelope();
    final userRaw = data['user'];
    if (userRaw is! Map<String, Object?>) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }
    return UserMeDto.fromJson(userRaw);
  }
}
