import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_state.dart';
import 'package:cuadrala_mobile/src/router/auth_redirect.dart';
import 'package:cuadrala_mobile/src/router/routes.dart';

void main() {
  group('authRedirectForLocation', () {
    test('sin sesión: ruta protegida redirige a /welcome', () {
      const session = SessionState.unauthenticated();

      final redirect = authRedirectForLocation(session, Routes.home);

      expect(redirect, Routes.welcome);
    });

    test('con sesión: /login redirige a /home', () {
      const session = SessionState.authenticated();

      final redirect = authRedirectForLocation(session, Routes.login);

      expect(redirect, Routes.home);
    });

    test('con sesión: ruta protegida no redirige', () {
      const session = SessionState.authenticated();

      final redirect = authRedirectForLocation(session, Routes.home);

      expect(redirect, isNull);
    });

    group('onboarding guard', () {
      test('autenticado con onboarding pendiente: /home → /onboarding', () {
        const session = SessionState.authenticated(onboardingComplete: false);

        final redirect = authRedirectForLocation(session, Routes.home);

        expect(redirect, Routes.onboarding);
      });

      test('autenticado con onboarding pendiente: /onboarding no redirige', () {
        const session = SessionState.authenticated(onboardingComplete: false);

        final redirect = authRedirectForLocation(session, Routes.onboarding);

        expect(redirect, isNull);
      });

      test('autenticado con onboarding completo: /onboarding → /home', () {
        const session = SessionState.authenticated(onboardingComplete: true);

        final redirect = authRedirectForLocation(session, Routes.onboarding);

        expect(redirect, Routes.home);
      });

      test('sin sesión: /onboarding → /welcome', () {
        const session = SessionState.unauthenticated();

        final redirect = authRedirectForLocation(session, Routes.onboarding);

        expect(redirect, Routes.welcome);
      });
    });
  });
}

