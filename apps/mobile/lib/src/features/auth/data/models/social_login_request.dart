final class SocialLoginRequest {
  const SocialLoginRequest({
    required this.provider,
    required this.idToken,
    this.name,
  });

  final String provider; // 'google' | 'apple'
  final String idToken;
  final String? name;

  Map<String, Object?> toJson() => {
        'provider': provider,
        'idToken': idToken,
        if (name != null && name!.trim().isNotEmpty) 'name': name!.trim(),
      };
}

