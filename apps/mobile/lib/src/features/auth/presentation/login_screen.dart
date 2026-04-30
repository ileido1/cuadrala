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
      appBar: AppBar(title: const Text('Iniciar sesión')),
      body: BlocBuilder<LoginCubit, LoginState>(
        builder: (context, state) {
          final isLoading = state is LoginLoading;
          final errorMessage = state is LoginFailure ? state.message : null;

          return Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  key: const Key('login.email'),
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
                const SizedBox(height: 12),
                TextField(
                  key: const Key('login.password'),
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Contraseña'),
                ),
                const SizedBox(height: 16),
                if (errorMessage != null) ...[
                  Text(
                    errorMessage,
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                  const SizedBox(height: 12),
                ],
                PrimaryButton(
                  key: const Key('login.submit'),
                  label: 'Entrar',
                  isLoading: isLoading,
                  onPressed: () => context.read<LoginCubit>().submit(
                        LoginRequest(
                          email: _emailController.text.trim(),
                          password: _passwordController.text,
                        ),
                      ),
                ),
                const SizedBox(height: 12),
                TextButton(
                  key: const Key('login.go_register'),
                  onPressed: isLoading ? null : () => context.go(Routes.register),
                  child: const Text('Crear cuenta'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
