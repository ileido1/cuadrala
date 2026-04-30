import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_state.dart';
import 'package:cuadrala_mobile/src/router/auth_redirect.dart';
import 'package:cuadrala_mobile/src/router/routes.dart';

class _FakeGoRouterState extends Fake implements GoRouterState {
  _FakeGoRouterState(this._matchedLocation);

  final String _matchedLocation;

  @override
  String get matchedLocation => _matchedLocation;

  @override
  Uri get uri => Uri.parse(_matchedLocation);
}

void main() {
  group('auth redirect / guard', () {
    test('sin sesión: ruta protegida redirige a /login', () {
      // Arrange
      const session = SessionState.unauthenticated();
      final state = _FakeGoRouterState(Routes.home);

      // Act
      final redirect = authRedirect(session, state);

      // Assert
      expect(redirect, Routes.login);
    });

    test('con sesión: /login redirige a /home', () {
      // Arrange
      const session = SessionState.authenticated();
      final state = _FakeGoRouterState(Routes.login);

      // Act
      final redirect = authRedirect(session, state);

      // Assert
      expect(redirect, Routes.home);
    });

    test('con sesión: ruta protegida no redirige', () {
      // Arrange
      const session = SessionState.authenticated();
      final state = _FakeGoRouterState(Routes.home);

      // Act
      final redirect = authRedirect(session, state);

      // Assert
      expect(redirect, isNull);
    });
  });
}

