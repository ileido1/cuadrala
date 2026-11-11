import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/auth/presentation/google_sign_in_init.dart';

//? CUADRALA-MOBILE-7: cada LoginScreen nueva llamaba a
//? GoogleSignIn.instance.initialize(); en web la segunda llamada lanza
//? StateError y el login con Google deja de responder.
void main() {
  test(
    'should initialize once across calls and retry only after a failure',
    () async {
      var calls = 0;

      //? Un primer intento fallido no debe dejar el error memorizado.
      await expectLater(
        ensureGoogleSignInInitialized(() async {
          calls++;
          throw StateError('network');
        }),
        throwsStateError,
      );

      Future<void> ok() async => calls++;
      await ensureGoogleSignInInitialized(ok);
      await ensureGoogleSignInInitialized(ok);
      await ensureGoogleSignInInitialized(ok);

      expect(calls, 2);
    },
  );
}
