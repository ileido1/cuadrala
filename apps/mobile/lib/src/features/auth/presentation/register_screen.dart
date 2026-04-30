import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../router/routes.dart';
import '../../../shared/widgets/primary_button.dart';
import 'cubit/register_cubit.dart';
import 'cubit/register_state.dart';
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
      appBar: AppBar(title: const Text('Crear cuenta')),
      body: BlocConsumer<RegisterCubit, RegisterState>(
        listener: (context, state) {
          if (state is RegisterSuccess) {
            context.go(Routes.home);
          }
        },
        builder: (context, state) {
          final isLoading = state is RegisterLoading;
          final errorMessage = state is RegisterFailure ? state.message : null;

          return Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  key: const Key('register.name'),
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Nombre'),
                ),
                const SizedBox(height: 12),
                TextField(
                  key: const Key('register.email'),
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
                const SizedBox(height: 12),
                TextField(
                  key: const Key('register.password'),
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
                const SizedBox(height: 12),
                TextButton(
                  onPressed: isLoading ? null : () => context.go(Routes.login),
                  child: const Text('Ya tengo cuenta'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

