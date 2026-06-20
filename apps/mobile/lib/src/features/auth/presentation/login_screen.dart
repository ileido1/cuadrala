import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
// Login social (Google/Apple) comentado a pedido: se lanza bastante después
// del MVP. Reactivar junto con el bloque comentado más abajo.
// import 'package:google_sign_in/google_sign_in.dart';
// import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../data/models/login_request.dart';
// import '../data/models/social_login_request.dart';
// import '../data/auth_repository.dart';
import 'cubit/login_cubit.dart';
import 'cubit/login_state.dart';
import 'cubit/session_cubit.dart';
import 'cubit/session_state.dart';
import 'widgets/auth_header.dart';
import 'widgets/auth_tabs.dart';
// import 'widgets/google_g_logo.dart';
// import 'widgets/social_button.dart';
// import '../../../core/di/service_locator.dart';
// import '../../../core/env/app_env.dart';
import '../../../core/theme/app_icons.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/primary_button.dart';

final class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _socialLoading = false;
  // Future<void>? _googleInit;
  //
  // Future<void> _ensureGoogleInitialized() {
  //   final init = _googleInit;
  //   if (init != null) return init;
  //   final env = getIt<AppEnv>();
  //   final future = GoogleSignIn.instance.initialize(
  //     clientId: env.googleWebClientId,
  //     serverClientId: env.googleWebClientId,
  //   );
  //   _googleInit = future;
  //   return future;
  // }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // Future<void> _socialLoginGoogle() async {
  //   setState(() => _socialLoading = true);
  //   try {
  //     await _ensureGoogleInitialized();
  //     final account = await GoogleSignIn.instance.authenticate(
  //       scopeHint: const ['email', 'profile'],
  //     );
  //     final idToken = account.authentication.idToken;
  //     if (idToken == null || idToken.isEmpty) {
  //       throw Exception('No se pudo obtener idToken de Google.');
  //     }
  //     await getIt<AuthRepository>().socialLogin(
  //       SocialLoginRequest(
  //         provider: 'google',
  //         idToken: idToken,
  //         name: account.displayName,
  //       ),
  //     );
  //     if (!mounted) return;
  //     await context.read<SessionCubit>().markAuthenticated();
  //     if (!mounted) return;
  //     final session = context.read<SessionCubit>().state;
  //     if (session is SessionAuthenticated && session.onboardingComplete == false) {
  //       context.go(Routes.onboarding);
  //     } else {
  //       context.go(Routes.home);
  //     }
  //   } catch (e) {
  //     if (!mounted) return;
  //     ScaffoldMessenger.of(context).showSnackBar(
  //       SnackBar(content: Text('Error Google: $e'), duration: const Duration(seconds: 8)),
  //     );
  //   } finally {
  //     if (mounted) setState(() => _socialLoading = false);
  //   }
  // }
  //
  // Future<void> _socialLoginApple() async {
  //   setState(() => _socialLoading = true);
  //   try {
  //     final credential = await SignInWithApple.getAppleIDCredential(
  //       scopes: const [
  //         AppleIDAuthorizationScopes.email,
  //         AppleIDAuthorizationScopes.fullName,
  //       ],
  //     );
  //     final idToken = credential.identityToken;
  //     if (idToken == null || idToken.isEmpty) {
  //       throw Exception('No se pudo obtener identityToken de Apple.');
  //     }
  //     final fullName = [credential.givenName, credential.familyName]
  //         .whereType<String>()
  //         .where((p) => p.trim().isNotEmpty)
  //         .join(' ');
  //     await getIt<AuthRepository>().socialLogin(
  //       SocialLoginRequest(
  //         provider: 'apple',
  //         idToken: idToken,
  //         name: fullName.isEmpty ? null : fullName,
  //       ),
  //     );
  //     if (!mounted) return;
  //     await context.read<SessionCubit>().markAuthenticated();
  //     if (!mounted) return;
  //     final session = context.read<SessionCubit>().state;
  //     if (session is SessionAuthenticated && session.onboardingComplete == false) {
  //       context.go(Routes.onboarding);
  //     } else {
  //       context.go(Routes.home);
  //     }
  //   } catch (_) {
  //     if (!mounted) return;
  //     ScaffoldMessenger.of(context).showSnackBar(
  //       const SnackBar(content: Text('No se pudo iniciar con Apple.')),
  //     );
  //   } finally {
  //     if (mounted) setState(() => _socialLoading = false);
  //   }
  // }

  void _submit() {
    context.read<LoginCubit>().submit(
          LoginRequest(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('login.screen'),
      body: BlocConsumer<LoginCubit, LoginState>(
        listener: (context, state) async {
          if (state is LoginSuccess) {
            await context.read<SessionCubit>().markAuthenticated();
            if (!context.mounted) return;
            final session = context.read<SessionCubit>().state;
            if (session is SessionAuthenticated &&
                session.onboardingComplete == false) {
              context.go(Routes.onboarding);
            } else {
              context.go(Routes.home);
            }
          }
        },
        builder: (context, state) {
          final isLoading = state is LoginLoading;
          final isBusy = isLoading || _socialLoading;
          final errorMessage = state is LoginFailure ? state.message : null;
          final scheme = Theme.of(context).colorScheme;

          Widget content() => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const AuthHeader(
                    title: 'Bienvenido de vuelta',
                    subtitle: 'Inicia sesión para seguir cuadrando partidas.',
                  ),
                  const SizedBox(height: 22),
                  AuthTabs(
                    selectedIndex: 0,
                    isDisabled: isBusy,
                    onTabChanged: (i) {
                      if (i == 1) context.go(Routes.register);
                    },
                  ),
                  // Login social (Google/Apple) comentado a pedido: se lanza
                  // bastante después del MVP. El diseño actual tampoco lo
                  // muestra (sin botones sociales arriba, sin este divisor).
                  // SocialButton(
                  //   icon: const GoogleGLogo(size: 20),
                  //   label: 'Continuar con Google',
                  //   background: scheme.surface,
                  //   foreground: scheme.onSurface,
                  //   border: scheme.outlineVariant,
                  //   onPressed: isBusy ? null : _socialLoginGoogle,
                  // ),
                  // const SizedBox(height: 10),
                  // SocialButton(
                  //   icon: const Icon(AppIcons.appleLogo),
                  //   label: 'Continuar con Apple',
                  //   background: scheme.surface,
                  //   foreground: scheme.onSurface,
                  //   border: scheme.outlineVariant,
                  //   onPressed: isBusy ? null : _socialLoginApple,
                  // ),
                  // const SizedBox(height: 18),
                  // Row(
                  //   children: [
                  //     Expanded(child: Divider(color: scheme.outlineVariant, thickness: 1)),
                  //     Padding(
                  //       padding: const EdgeInsets.symmetric(horizontal: 12),
                  //       child: Text(
                  //         'o continuar con email',
                  //         style: TextStyle(
                  //           color: scheme.onSurfaceVariant,
                  //           fontWeight: FontWeight.w800,
                  //         ),
                  //       ),
                  //     ),
                  //     Expanded(child: Divider(color: scheme.outlineVariant, thickness: 1)),
                  //   ],
                  // ),
                  const SizedBox(height: 18),
                  TextField(
                    key: const Key('login.email'),
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autocorrect: false,
                    decoration: const InputDecoration(
                      labelText: 'Correo electrónico',
                      hintText: 'tu@email.com',
                      prefixIcon: Icon(AppIcons.mail),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    key: const Key('login.password'),
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _submit(),
                    decoration: InputDecoration(
                      labelText: 'Contraseña',
                      prefixIcon: const Icon(AppIcons.lock),
                      suffixIcon: IconButton(
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        icon: Icon(
                          _obscurePassword
                              ? AppIcons.eyeOn
                              : AppIcons.eyeOff,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: isBusy
                          ? null
                          : () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Próximamente'),
                                  duration: Duration(seconds: 3),
                                ),
                              );
                            },
                      child: Text(
                        '¿Olvidaste tu contraseña?',
                        style: TextStyle(
                          color: scheme.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                  if (errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        color: scheme.error.withValues(alpha: 0.10),
                        border: Border.all(color: scheme.error.withValues(alpha: 0.25)),
                      ),
                      child: Row(
                        children: [
                          Icon(AppIcons.warning, color: scheme.error, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              errorMessage,
                              style: TextStyle(
                                color: scheme.onErrorContainer,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ] else
                    const SizedBox(height: 20),
                  PrimaryButton(
                    key: const Key('login.submit'),
                    label: 'Iniciar sesión',
                    height: 52,
                    isLoading: isLoading,
                    onPressed: _submit,
                  ),
                  const SizedBox(height: 18),
                  Wrap(
                    alignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        '¿No tienes cuenta? ',
                        style: TextStyle(color: scheme.onSurfaceVariant),
                      ),
                      InkWell(
                        key: const Key('login.go_register'),
                        onTap: isBusy ? null : () => context.go(Routes.register),
                        child: Text(
                          'Crear cuenta',
                          style: TextStyle(
                            color: scheme.primary,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              );

          return SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) => SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 420),
                      child: content(),
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

