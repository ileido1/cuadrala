import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../router/routes.dart';
import '../../../shared/widgets/primary_button.dart';
import '../data/models/register_request.dart';
import 'cubit/register_cubit.dart';
import 'cubit/register_state.dart';
import 'cubit/session_cubit.dart';
import 'cubit/session_state.dart';
import 'widgets/auth_header.dart';
import 'widgets/auth_tabs.dart';
import 'widgets/password_strength_indicator.dart';

final class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  String? _confirmError;

  @override
  void initState() {
    super.initState();
    _passwordController.addListener(_onPasswordChanged);
    _confirmController.addListener(_validateConfirm);
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  void _onPasswordChanged() {
    setState(() {});
    if (_confirmController.text.isNotEmpty) _validateConfirm();
  }

  void _validateConfirm() {
    final pw = _passwordController.text;
    final cf = _confirmController.text;
    setState(() {
      _confirmError = (cf.isEmpty || cf == pw) ? null : 'Las contraseñas no coinciden';
    });
  }

  String _nameFromEmail(String email) {
    final user = email.split('@').first.replaceAll(RegExp(r'[._]'), ' ').trim();
    if (user.isEmpty) return 'Jugador';
    return user
        .split(' ')
        .where((p) => p.isNotEmpty)
        .map((p) => p[0].toUpperCase() + p.substring(1))
        .join(' ');
  }

  void _submit() {
    final email = _emailController.text.trim();
    final pw = _passwordController.text;
    final cf = _confirmController.text;
    if (pw != cf) {
      setState(() => _confirmError = 'Las contraseñas no coinciden');
      return;
    }
    context.read<RegisterCubit>().submit(
          RegisterRequest(email: email, password: pw, name: _nameFromEmail(email)),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('register.screen'),
      body: BlocConsumer<RegisterCubit, RegisterState>(
        listener: (context, state) async {
          if (state is RegisterSuccess) {
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
          if (state is RegisterFailure) {
            final messenger = ScaffoldMessenger.of(context);
            messenger.hideCurrentSnackBar();
            messenger.showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
            );
          }
        },
        builder: (context, state) {
          final isLoading = state is RegisterLoading;
          final fieldErrors = state is RegisterFailure ? state.fieldErrors : null;
          final scheme = Theme.of(context).colorScheme;

          Widget content() => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const AuthHeader(
                    title: 'Crea tu cuenta',
                    subtitle: 'Usarás este correo para ingresar.',
                  ),
                  const SizedBox(height: 18),
                  AuthTabs(
                    selectedIndex: 1,
                    isDisabled: isLoading,
                    onTabChanged: (i) {
                      if (i == 0) context.go(Routes.login);
                    },
                  ),
                  const SizedBox(height: 18),
                  TextField(
                    key: const Key('register.email'),
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autocorrect: false,
                    decoration: InputDecoration(
                      labelText: 'Correo electrónico',
                      hintText: 'tu@email.com',
                      prefixIcon: const Icon(Icons.mail_outline),
                      errorText: fieldErrors?.email,
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    key: const Key('register.password'),
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    textInputAction: TextInputAction.next,
                    decoration: InputDecoration(
                      labelText: 'Contraseña',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                      ),
                      errorText: fieldErrors?.password,
                    ),
                  ),
                  PasswordStrengthIndicator(password: _passwordController.text),
                  const SizedBox(height: 14),
                  TextField(
                    key: const Key('register.confirm_password'),
                    controller: _confirmController,
                    obscureText: _obscureConfirm,
                    textInputAction: TextInputAction.done,
                    decoration: InputDecoration(
                      labelText: 'Confirmar contraseña',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                        icon: Icon(
                          _obscureConfirm
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                      ),
                      errorText: _confirmError,
                    ),
                    onSubmitted: (_) => _submit(),
                  ),
                  const SizedBox(height: 24),
                  PrimaryButton(
                    label: 'Continuar',
                    isLoading: isLoading,
                    onPressed: _submit,
                  ),
                  const SizedBox(height: 14),
                  Wrap(
                    alignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        '¿Ya tienes cuenta? ',
                        style: TextStyle(color: scheme.onSurfaceVariant),
                      ),
                      InkWell(
                        onTap: isLoading ? null : () => context.go(Routes.login),
                        child: Text(
                          'Inicia sesión',
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

