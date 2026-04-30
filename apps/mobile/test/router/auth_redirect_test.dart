import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_state.dart';
import 'package:cuadrala_mobile/src/router/auth_redirect.dart';
import 'package:cuadrala_mobile/src/router/routes.dart';

void main() {
  group('authRedirectForLocation', () {
    test('sin sesión: ruta protegida redirige a /login', () {
      const session = SessionState.unauthenticated();

      final redirect = authRedirectForLocation(session, Routes.home);

      expect(redirect, Routes.login);
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
  });
}

