final class UserMeDto {
  const UserMeDto({
    required this.id,
    required this.email,
    required this.name,
    required this.subscriptionType,
    this.primaryRating,
  });

  final String id;
  final String email;
  final String name;
  final String subscriptionType;

  /// Resumen de nivel (categoría + ELO) del jugador. `null` si aún no tiene
  /// ratings registrados.
  final UserPrimaryRatingDto? primaryRating;

  static UserMeDto fromJson(Map<String, Object?> json) {
    final ratingRaw = json['primaryRating'];
    return UserMeDto(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      subscriptionType: json['subscriptionType'] as String,
      primaryRating: ratingRaw is Map<String, Object?>
          ? UserPrimaryRatingDto.fromJson(ratingRaw)
          : null,
    );
  }
}

/// Categoría de mayor ELO del jugador, con nombre de categoría y deporte.
final class UserPrimaryRatingDto {
  const UserPrimaryRatingDto({
    required this.categoryId,
    required this.categoryName,
    required this.sportId,
    required this.rating,
  });

  final String categoryId;
  final String categoryName;
  final String sportId;
  final double rating;

  static UserPrimaryRatingDto fromJson(Map<String, Object?> json) {
    return UserPrimaryRatingDto(
      categoryId: json['categoryId'] as String,
      categoryName: json['categoryName'] as String,
      sportId: json['sportId'] as String,
      rating: (json['rating'] as num).toDouble(),
    );
  }
}
