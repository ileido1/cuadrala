import 'package:equatable/equatable.dart';

/// DTO for a tournament list item returned by GET /api/v1/tournaments.
final class TournamentListItemDto extends Equatable {
  const TournamentListItemDto({
    required this.id,
    required this.name,
    required this.status,
    required this.sportName,
    required this.categoryName,
    required this.startsAt,
    required this.registrationCount,
    this.imageUrl,
  });

  final String id;
  final String name;
  final String status;
  final String sportName;
  final String categoryName;
  final DateTime? startsAt;
  final int registrationCount;
  final String? imageUrl;

  factory TournamentListItemDto.fromJson(Map<String, Object?> json) {
    return TournamentListItemDto(
      id: json['id'] as String,
      name: json['name'] as String,
      status: json['status'] as String,
      sportName: (json['sportName'] ?? json['sport_name'] ?? '') as String,
      categoryName:
          (json['categoryName'] ?? json['category_name'] ?? '') as String,
      startsAt: json['startsAt'] != null || json['starts_at'] != null
          ? DateTime.tryParse(
              (json['startsAt'] ?? json['starts_at']) as String)
          : null,
      registrationCount:
          (json['registrationCount'] ??
                  json['registration_count'] ??
                  0) as int,
      imageUrl: json['imageUrl'] as String? ?? json['image_url'] as String?,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        status,
        sportName,
        categoryName,
        startsAt,
        registrationCount,
        imageUrl,
      ];
}
