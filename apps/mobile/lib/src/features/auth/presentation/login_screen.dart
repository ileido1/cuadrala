import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../data/models/login_request.dart';
import 'cubit/login_cubit.dart';
import 'cubit/login_state.dart';
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

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('login.screen'),
      body: BlocBuilder<LoginCubit, LoginState>(
        builder: (context, state) {
          final isLoading = state is LoginLoading;
          final errorMessage = state is LoginFailure ? state.message : null;

          Widget content() => Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _LogoHeader(),
                  const SizedBox(height: 20),
                  _AuthToggle(
                    selected: _AuthToggleSelected.login,
                    onSelectLogin: () {},
                    onSelectRegister:
                        isLoading ? null : () => context.go(Routes.register),
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    key: const Key('login.email'),
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(labelText: 'Email'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    key: const Key('login.password'),
                    controller: _passwordController,
                    obscureText: true,
                    textInputAction: TextInputAction.done,
                    decoration: const InputDecoration(labelText: 'Contraseña'),
                  ),
                  const SizedBox(height: 10),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: isLoading ? null : () {},
                      child: Text(
                        '¿Olvidaste tu contraseña?',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  if (errorMessage != null) ...[
                    const SizedBox(height: 6),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        errorMessage,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  PrimaryButton(
                    key: const Key('login.submit'),
                    label: 'Iniciar sesión',
                    isLoading: isLoading,
                    onPressed: () => context.read<LoginCubit>().submit(
                          LoginRequest(
                            email: _emailController.text.trim(),
                            password: _passwordController.text,
                          ),
                        ),
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    key: const Key('login.go_register'),
                    onPressed:
                        isLoading ? null : () => context.go(Routes.register),
                    child: const Text('Crear cuenta'),
                  ),
                ],
              );

          return SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) => SingleChildScrollView(
                padding: const EdgeInsets.all(20),
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

enum _AuthToggleSelected { login, register }

final class _AuthToggle extends StatelessWidget {
  const _AuthToggle({
    required this.selected,
    required this.onSelectLogin,
    required this.onSelectRegister,
  });

  final _AuthToggleSelected selected;
  final VoidCallback? onSelectLogin;
  final VoidCallback? onSelectRegister;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    Widget buildButton({
      required String label,
      required bool active,
      required VoidCallback? onPressed,
    }) {
      if (active) {
        return Expanded(
          child: FilledButton(
            onPressed: onPressed,
            style: FilledButton.styleFrom(
              backgroundColor: scheme.surfaceContainerHighest,
              foregroundColor: scheme.onSurface,
            ),
            child: Text(label),
          ),
        );
      }

      return Expanded(
        child: OutlinedButton(
          onPressed: onPressed,
          child: Text(label),
        ),
      );
    }

    return Row(
      children: [
        buildButton(
          label: 'Ingresar',
          active: selected == _AuthToggleSelected.login,
          onPressed: onSelectLogin,
        ),
        const SizedBox(width: 12),
        buildButton(
          label: 'Crear cuenta',
          active: selected == _AuthToggleSelected.register,
          onPressed: onSelectRegister,
        ),
      ],
    );
  }
}

final class _LogoHeader extends StatelessWidget {
  const _LogoHeader();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: scheme.primary,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Icon(Icons.emoji_events, color: scheme.onPrimary, size: 34),
        ),
        const SizedBox(height: 14),
        const Text(
          'Cuádrala',
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 6),
        Text(
          'Armar el juego nunca fue tan fácil.',
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
