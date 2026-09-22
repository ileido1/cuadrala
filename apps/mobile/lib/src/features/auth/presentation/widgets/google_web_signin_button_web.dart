import 'package:flutter/widgets.dart';
import 'package:google_sign_in_web/web_only.dart' as google_web;

/// Renders Google's native GIS sign-in button.
///
/// `GoogleSignIn.instance.authenticate()` throws `UnimplementedError` on the
/// web — Google requires this rendered button instead. The resulting sign-in
/// is delivered via `GoogleSignIn.instance.authenticationEvents`, not as a
/// return value, so the caller must already be subscribed to that stream.
Widget googleWebSignInButton() => google_web.renderButton();
