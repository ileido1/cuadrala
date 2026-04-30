final class Routes {
  static const login = '/login';
  static const register = '/register';
  static const home = '/home';
  static const matches = '/matches';
  static const tournaments = '/tournaments';
  static const notifications = '/notifications';

  static String matchDetail(String matchId) => '/matches/$matchId';
  static String tournamentDetail(String tournamentId) => '/tournaments/$tournamentId';
  static String notificationDetail(String notificationId) =>
      '/notifications/$notificationId';
}
