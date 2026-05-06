import '../../../core/failures/app_failure.dart';
import 'catalog_api.dart';
import 'models/category_dto.dart';
import 'models/sport_dto.dart';

final class CatalogRepository {
  CatalogRepository({required CatalogApi catalogApi}) : _catalogApi = catalogApi;

  final CatalogApi _catalogApi;

  Future<List<SportDto>> listSports() async {
    final data = await _catalogApi.listSportsEnvelope();
    final sportsRaw = data['sports'];
    if (sportsRaw is! List) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }
    return sportsRaw
        .whereType<Map<String, Object?>>()
        .map(SportDto.fromJson)
        .toList();
  }

  Future<List<CategoryDto>> listCategories() async {
    final data = await _catalogApi.listCategoriesEnvelope();
    final raw = data['categories'];
    if (raw is! List) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }
    return raw.whereType<Map<String, Object?>>().map(CategoryDto.fromJson).toList();
  }
}
