import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../router/routes.dart';
import '../../../shared/widgets/primary_button.dart';
import 'cubit/register_cubit.dart';
import 'cubit/register_state.dart';
import 'cubit/session_cubit.dart';
import '../data/models/register_request.dart';

final class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('register.screen'),
      body: BlocConsumer<RegisterCubit, RegisterState>(
        listener: (context, state) {
          if (state is RegisterSuccess) {
            context.read<SessionCubit>().markAuthenticated();
            context.go(Routes.home);
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

          Widget content() => Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const _RegisterLogoHeader(),
                  const SizedBox(height: 20),
                  _RegisterAuthToggle(
                    onSelectLogin:
                        isLoading ? null : () => context.go(Routes.login),
                    onSelectRegister: () {},
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    key: const Key('register.name'),
                    controller: _nameController,
                    textInputAction: TextInputAction.next,
                    decoration: InputDecoration(
                      labelText: 'Nombre',
                      errorText: fieldErrors?.name,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    key: const Key('register.email'),
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    decoration: InputDecoration(
                      labelText: 'Email',
                      errorText: fieldErrors?.email,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    key: const Key('register.password'),
                    controller: _passwordController,
                    obscureText: true,
                    textInputAction: TextInputAction.done,
                    decoration: InputDecoration(
                      labelText: 'Contraseña',
                      errorText: fieldErrors?.password,
                    ),
                  ),
                  // El mensaje global se muestra como SnackBar (toast).
                  const SizedBox(height: 12),
                  PrimaryButton(
                    label: 'Crear cuenta',
                    isLoading: isLoading,
                    onPressed: () => context.read<RegisterCubit>().submit(
                          RegisterRequest(
                            email: _emailController.text.trim(),
                            password: _passwordController.text,
                            name: _nameController.text.trim(),
                          ),
                        ),
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed:
                        isLoading ? null : () => context.go(Routes.login),
                    child: const Text('Ya tengo cuenta'),
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

final class _RegisterAuthToggle extends StatelessWidget {
  const _RegisterAuthToggle({
    required this.onSelectLogin,
    required this.onSelectRegister,
  });

  final VoidCallback? onSelectLogin;
  final VoidCallback? onSelectRegister;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: onSelectLogin,
            child: const Text('Ingresar'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: FilledButton(
            onPressed: onSelectRegister,
            style: FilledButton.styleFrom(
              backgroundColor: scheme.surfaceContainerHighest,
              foregroundColor: scheme.onSurface,
            ),
            child: const Text('Crear cuenta'),
          ),
        ),
      ],
    );
  }
}

final class _RegisterLogoHeader extends StatelessWidget {
  const _RegisterLogoHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: Image.asset(
            'assets/images/logo.png',
            width: 72,
            height: 72,
            fit: BoxFit.cover,
          ),
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

