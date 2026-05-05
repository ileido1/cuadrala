final class UserMeDto {
  const UserMeDto({
    required this.id,
    required this.email,
    required this.name,
    required this.subscriptionType,
  });

  final String id;
  final String email;
  final String name;
  final String subscriptionType;

  static UserMeDto fromJson(Map<String, Object?> json) {
    return UserMeDto(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      subscriptionType: json['subscriptionType'] as String,
    );
  }
}
