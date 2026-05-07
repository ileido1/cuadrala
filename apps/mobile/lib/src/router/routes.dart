final class Routes {
  static const welcome = '/welcome';
  static const login = '/login';
  static const register = '/register';
  static const onboarding = '/onboarding';
  static const home = '/home';
  static const matches = '/matches';
  static const createMatch = '/matches/create';
  static String matchLifecycle(String matchId) => '/matches/$matchId/lifecycle';
  static String matchResult(String matchId) => '/matches/$matchId/result';
  static String matchChat(String matchId) => '/matches/$matchId/chat';
  static const tournaments = '/tournaments';
  static const createTournament = '/tournaments/create';
  static const notifications = '/notifications';

  static String matchDetail(String matchId) => '/matches/$matchId';
  static String tournamentDetail(String tournamentId) => '/tournaments/$tournamentId';
  static String notificationDetail(String notificationId) =>
      '/notifications/$notificationId';
}
