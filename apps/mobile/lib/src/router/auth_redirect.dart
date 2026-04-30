import 'package:go_router/go_router.dart';

import '../features/auth/presentation/cubit/session_state.dart';
import 'routes.dart';

String? authRedirect(SessionState session, GoRouterState state) {
  return authRedirectForLocation(session, state.uri.toString());
}

String? authRedirectForLocation(SessionState session, String location) {
  final isAuthRoute =
      location == Routes.login || location == Routes.register || location == '/';

  final isProtected = location.startsWith(Routes.home) ||
      location.startsWith(Routes.matches) ||
      location.startsWith(Routes.tournaments) ||
      location.startsWith(Routes.notifications);

  return switch (session) {
    SessionLoading() => null,
    SessionAuthenticated() => isAuthRoute ? Routes.home : null,
    SessionUnauthenticated() => isProtected ? Routes.login : null,
  };
}
