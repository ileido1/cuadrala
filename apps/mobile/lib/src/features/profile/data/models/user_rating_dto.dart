final class UserRatingDto {
  const UserRatingDto({
    required this.categoryId,
    required this.rating,
    required this.updatedAt,
    this.categoryName,
    this.sportId,
  });

  final String categoryId;
  final double rating;
  final DateTime updatedAt;

  /// Nombre de la categoría (ej. "7ma"). Opcional, puede no venir en todos los endpoints.
  final String? categoryName;

  /// ID del deporte (ej. "sport-padel"). Opcional, puede no venir en todos los endpoints.
  final String? sportId;

  static UserRatingDto fromJson(Map<String, Object?> json) {
    return UserRatingDto(
      categoryId: (json['categoryId'] ?? json['category_id']) as String,
      rating: (json['rating'] as num).toDouble(),
      updatedAt: DateTime.parse(
        (json['updatedAt'] ?? json['updated_at']) as String,
      ),
      categoryName:
          (json['categoryName'] ?? json['category_name']) as String?,
      sportId: (json['sportId'] ?? json['sport_id']) as String?,
    );
  }
}

final class UserRatingHistoryItemDto {
  const UserRatingHistoryItemDto({
    required this.matchId,
    required this.resultId,
    required this.previousRating,
    required this.newRating,
    required this.kFactor,
    required this.createdAt,
  });

  final String matchId;
  final String resultId;
  final double previousRating;
  final double newRating;
  final double kFactor;
  final DateTime createdAt;

  static UserRatingHistoryItemDto fromJson(Map<String, Object?> json) {
    return UserRatingHistoryItemDto(
      matchId: json['matchId'] as String,
      resultId: json['resultId'] as String,
      previousRating: (json['previousRating'] as num).toDouble(),
      newRating: (json['newRating'] as num).toDouble(),
      kFactor: (json['kFactor'] as num).toDouble(),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

