final class UserRatingDto {
  const UserRatingDto({
    required this.categoryId,
    required this.rating,
    required this.updatedAt,
  });

  final String categoryId;
  final double rating;
  final DateTime updatedAt;

  static UserRatingDto fromJson(Map<String, Object?> json) {
    return UserRatingDto(
      categoryId: json['categoryId'] as String,
      rating: (json['rating'] as num).toDouble(),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
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

