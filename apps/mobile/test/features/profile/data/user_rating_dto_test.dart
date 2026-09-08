import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/profile/data/models/user_rating_dto.dart';

void main() {
  group('UserRatingDto', () {
    test('should parse categoryName and sportId from API', () {
      final json = {
        'categoryId': 'cat-7ma',
        'categoryName': '7ma',
        'sportId': 'sport-padel',
        'rating': 1250.5,
        'updatedAt': '2026-09-08T14:30:00Z',
      };

      final dto = UserRatingDto.fromJson(json);

      expect(dto.categoryId, 'cat-7ma');
      expect(dto.categoryName, '7ma');
      expect(dto.sportId, 'sport-padel');
      expect(dto.rating, 1250.5);
    });

    test('should handle camelCase and snake_case API variants', () {
      final jsonCamel = {
        'categoryId': 'cat-7ma',
        'categoryName': '7ma',
        'sportId': 'sport-padel',
        'rating': 1250.5,
        'updatedAt': '2026-09-08T14:30:00Z',
      };
      final jsonSnake = {
        'category_id': 'cat-7ma',
        'category_name': '7ma',
        'sport_id': 'sport-padel',
        'rating': 1250.5,
        'updated_at': '2026-09-08T14:30:00Z',
      };

      final dtoCamel = UserRatingDto.fromJson(jsonCamel);
      final dtoSnake = UserRatingDto.fromJson(jsonSnake);

      expect(dtoCamel.categoryId, dtoSnake.categoryId);
      expect(dtoCamel.categoryName, dtoSnake.categoryName);
      expect(dtoCamel.sportId, dtoSnake.sportId);
    });
  });
}
