final class CategoryDto {
  const CategoryDto({
    required this.id,
    required this.name,
    required this.slug,
  });

  final String id;
  final String name;
  final String slug;

  static CategoryDto fromJson(Map<String, Object?> json) {
    return CategoryDto(
      id: json['id'] as String,
      name: json['name'] as String,
      slug: json['slug'] as String,
    );
  }
}
