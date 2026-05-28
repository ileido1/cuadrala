import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

final class Routes {
  static const welcome = '/welcome';
  static const login = '/login';
  static const register = '/register';
  static const onboarding = '/onboarding';
  static const home = '/home';

  // Shell branch roots (StatefulShellRoute tabs)
  static const partidas = '/partidas';
  static const avisos = '/avisos';
  static const perfil = '/perfil';
  static const torneos = '/torneos';

  static const matches = '/matches';
  static const createMatch = '/matches/create';
  static String matchLifecycle(String matchId) => '/matches/$matchId/lifecycle';
  static String matchResult(String matchId) => '/matches/$matchId/result';
  static String matchChat(String matchId) => '/matches/$matchId/chat';
  static String matchChatReadOnly(String matchId) => '/matches/$matchId/chat/readonly';
  static String matchSuggestions(String matchId) => '/matches/$matchId/suggestions';
  static const tournaments = '/tournaments';
  static const createTournament = '/tournaments/create';
  static String tournamentChat(String tournamentId) => '/tournaments/$tournamentId/chat';
  static String tournamentChatReadOnly(String tournamentId) => '/tournaments/$tournamentId/chat/readonly';
  static const notifications = '/notifications';
  static const notificationPrefs = '/notifications/prefs';
  static const availability = '/availability';
  static const venues = '/venues';
  static String venueDetail(String venueId) => '/venues/$venueId';
  static String venueCreateMatch(String venueId) =>
      '/venues/$venueId/create-match';

  static String matchDetail(String matchId) => '/matches/$matchId';
  static String tournamentDetail(String tournamentId) => '/tournaments/$tournamentId';
  static String notificationDetail(String notificationId) =>
      '/notifications/$notificationId';

  /// Rutas de partida fuera del shell: tras `go` desde pago no hay stack previo.
  static void popOrGoPartidas(BuildContext context) {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go(partidas);
    }
  }
}
