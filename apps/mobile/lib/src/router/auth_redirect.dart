import 'package:go_router/go_router.dart';

import '../features/auth/presentation/cubit/session_state.dart';
import 'routes.dart';

String? authRedirect(SessionState session, GoRouterState state) {
  return authRedirectForLocation(session, state.uri.toString());
}

String? authRedirectForLocation(SessionState session, String location) {
  final isLoginOrRegister =
      location == Routes.login || location == Routes.register;
  final isWelcome = location == Routes.welcome;
  final isAuthRoute = isLoginOrRegister || isWelcome || location == '/';
  final isOnboardingRoute = location.startsWith(Routes.onboarding);

  final isProtected = location.startsWith(Routes.home) ||
      location.startsWith(Routes.partidas) ||
      location.startsWith(Routes.avisos) ||
      location.startsWith(Routes.perfil) ||
      location.startsWith(Routes.torneos) ||
      location.startsWith(Routes.matches) ||
      location.startsWith(Routes.tournaments) ||
      location.startsWith(Routes.notifications);

  return switch (session) {
    SessionLoading() => null,
    SessionAuthenticated(onboardingComplete: final complete) => () {
        // Aún no se sabe si el onboarding está completo: no forzamos redirect.
        if (complete == null) {
          return isAuthRoute ? Routes.home : null;
        }
        if (complete == false) {
          // Pendiente: bloquear cualquier ruta protegida y empujar al onboarding.
          if (isOnboardingRoute) return null;
          if (isProtected || isAuthRoute) return Routes.onboarding;
          return null;
        }
        // Onboarding completo: si va a auth/onboarding, lo mandamos a home.
        if (isOnboardingRoute || isAuthRoute) return Routes.home;
        return null;
      }(),
    SessionUnauthenticated() => () {
        if (isOnboardingRoute) return Routes.welcome;
        // Si toca una ruta protegida sin sesión, lo mandamos al gateway de bienvenida.
        if (isProtected) return Routes.welcome;
        return null;
      }(),
  };
}
