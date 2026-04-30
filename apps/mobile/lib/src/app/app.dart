import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../core/di/service_locator.dart';
import '../core/theme/app_theme.dart';
import '../features/auth/presentation/cubit/session_cubit.dart';
import '../router/app_router.dart';

final class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<SessionCubit>(
      create: (_) => getIt<SessionCubit>()..bootstrap(),
      child: Builder(
        builder: (context) {
          final router = AppRouter(sessionCubit: context.read<SessionCubit>());
          return MaterialApp.router(
            title: 'Cuádrala',
            theme: AppTheme.light(),
            routerConfig: router.router,
          );
        },
      ),
    );
  }
}

