final class AppEnv {
  const AppEnv({required this.baseUrl});

  final String baseUrl;

  factory AppEnv.fromEnvironment() {
    const baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (baseUrl.isEmpty) {
      return const AppEnv(baseUrl: 'http://localhost:4000');
    }
    return const AppEnv(baseUrl: baseUrl);
  }
}
