import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import 'widgets/google_g_logo.dart';
import 'widgets/social_button.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/env/app_env.dart';
import '../../../core/theme/brand_colors.dart';
import '../data/models/social_login_request.dart';
import '../data/auth_repository.dart';
import 'cubit/session_cubit.dart';
import '../../../router/routes.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  bool _isLoading = false;
  Future<void>? _googleInit;

  Future<void> _ensureGoogleInitialized() {
    final init = _googleInit;
    if (init != null) return init;
    final env = getIt<AppEnv>();
    final future = GoogleSignIn.instance.initialize(
      clientId: env.googleWebClientId,
      serverClientId: env.googleWebClientId,
    );
    _googleInit = future;
    return future;
  }

  Future<void> _socialLoginGoogle() async {
    setState(() => _isLoading = true);
    try {
      await _ensureGoogleInitialized();
      final account = await GoogleSignIn.instance.authenticate(
        scopeHint: const ['email', 'profile'],
      );
      final idToken = account.authentication.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw Exception('No se pudo obtener idToken de Google.');
      }

      await getIt<AuthRepository>().socialLogin(
        SocialLoginRequest(
          provider: 'google',
          idToken: idToken,
          name: account.displayName,
        ),
      );
      if (!mounted) return;
      await context.read<SessionCubit>().markAuthenticated();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error Google: $e'), duration: const Duration(seconds: 8)),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _socialLoginApple() async {
    setState(() => _isLoading = true);
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: const [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );
      final idToken = credential.identityToken;
      if (idToken == null || idToken.isEmpty) {
        throw Exception('No se pudo obtener identityToken de Apple.');
      }

      final fullName = [
        credential.givenName,
        credential.familyName,
      ].whereType<String>().where((p) => p.trim().isNotEmpty).join(' ');

      await getIt<AuthRepository>().socialLogin(
        SocialLoginRequest(
          provider: 'apple',
          idToken: idToken,
          name: fullName.isEmpty ? null : fullName,
        ),
      );
      if (!mounted) return;
      await context.read<SessionCubit>().markAuthenticated();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo iniciar con Apple.')),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      key: const Key('welcome.screen'),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight - 48),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 26),
                  Center(
                    child: Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        color: scheme.primary,
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: [
                          BoxShadow(
                            color: scheme.primary.withValues(alpha: 0.24),
                            blurRadius: 22,
                            offset: const Offset(0, 12),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(8),
                      child: ClipOval(
                        child: Container(
                          color: scheme.surface,
                          child: const Padding(
                            padding: EdgeInsets.all(4),
                            child: Image(
                              image: AssetImage('assets/images/logo.png'),
                              fit: BoxFit.contain,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Cuádrala',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 34,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Arma partidas, paga y juega.\nCero grupos de WhatsApp.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 28),
                  SocialButton(
                    icon: const GoogleGLogo(size: 20),
                    label: 'Continuar con Google',
                    background: scheme.surface,
                    foreground: scheme.onSurface,
                    border: scheme.outlineVariant,
                    onPressed: _isLoading ? null : _socialLoginGoogle,
                  ),
                  const SizedBox(height: 10),
                  SocialButton(
                    icon: const Icon(Icons.apple),
                    label: 'Continuar con Apple',
                    background: BrandColors.appleBlack,
                    foreground: scheme.onPrimary,
                    border: BrandColors.appleBlack,
                    onPressed: _isLoading ? null : _socialLoginApple,
                  ),
                  const SizedBox(height: 22),
                  Row(
                    children: [
                      Expanded(
                        child: Divider(
                          color: scheme.outlineVariant,
                          thickness: 1,
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text(
                          'o continuar con email',
                          style: TextStyle(
                            color: scheme.onSurfaceVariant,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Divider(
                          color: scheme.outlineVariant,
                          thickness: 1,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 22),
                  FilledButton(
                    onPressed: _isLoading ? null : () => context.go(Routes.register),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      textStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                    ),
                    child: const Text('Crear cuenta con email'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: _isLoading ? null : () => context.go(Routes.login),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      textStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                    ),
                    child: const Text('Ya tengo cuenta'),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Al continuar aceptas nuestros Términos y la Política de privacidad.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

