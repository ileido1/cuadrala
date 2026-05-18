final class CategoryDto {
  const CategoryDto({
    required this.id,
    required this.sportId,
    required this.name,
    required this.slug,
    required this.scheme,
    this.skillBand,
    required this.sortOrder,
  });

  final String id;
  final String sportId;
  final String name;
  final String slug;
  final String scheme;
  final String? skillBand;
  final int sortOrder;

  static CategoryDto fromJson(Map<String, Object?> json) {
    return CategoryDto(
      id: json['id'] as String,
      sportId: json['sportId'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
      scheme: json['scheme'] as String,
      skillBand: json['skillBand'] as String?,
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
    );
  }
}
