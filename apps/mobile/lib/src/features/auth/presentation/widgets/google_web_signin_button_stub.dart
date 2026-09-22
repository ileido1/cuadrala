import 'package:flutter/widgets.dart';

/// No-op on non-web platforms; `google_sign_in`'s `.authenticate()` popup
/// flow is used instead (see `_socialLoginGoogle` in `login_screen.dart`).
Widget googleWebSignInButton() => const SizedBox.shrink();
