import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../core/di/service_locator.dart';
import '../core/push/foreground_notification_handler.dart';
import '../core/push/push_notification_tap_handler.dart';
import '../core/push/push_token_sync_lifecycle.dart';
import '../core/theme/app_theme.dart';
import '../features/auth/presentation/cubit/session_cubit.dart';
import '../router/app_router.dart';

final class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<SessionCubit>.value(
      value: getIt<SessionCubit>()..bootstrap(),
      child: Builder(
        builder: (context) {
          final router = AppRouter(sessionCubit: context.read<SessionCubit>());
          setupPushNotificationTapHandler(router.router);
          return PushTokenSyncLifecycle(
            child: ForegroundNotificationHandler(
              child: MaterialApp.router(
                title: 'Cuádrala',
                theme: AppTheme.light(),
                darkTheme: AppTheme.dark(),
                themeMode: kIsWeb ? ThemeMode.dark : ThemeMode.system,
                routerConfig: router.router,
                builder: (context, child) {
                  final content = child ?? const SizedBox.shrink();
                  return kIsWeb ? WebMobileFrame(child: content) : content;
                },
              ),
            ),
          );
        },
      ),
    );
  }
}

final class WebMobileFrame extends StatelessWidget {
  const WebMobileFrame({required this.child, super.key});

  static const _maxWidth = 390.0;
  static const _phoneBreakpoint = 600.0;
  static const _cornerRadius = 28.0;

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;

    return ColoredBox(
      color: colors.surfaceContainerHighest,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final viewportWidth = constraints.maxWidth;
          final isPhone =
              constraints.hasBoundedWidth && viewportWidth <= _phoneBreakpoint;
          final width = isPhone
              ? viewportWidth
              : constraints.hasBoundedWidth
              ? math.min(_maxWidth, viewportWidth)
              : _maxWidth;
          final height = constraints.hasBoundedHeight
              ? constraints.maxHeight
              : null;

          return Center(
            child: Container(
              width: width,
              height: height,
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: colors.surfaceContainerLowest,
                borderRadius: BorderRadius.circular(
                  isPhone ? 0 : _cornerRadius,
                ),
                boxShadow: isPhone
                    ? const []
                    : [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.24),
                          blurRadius: 28,
                          offset: const Offset(0, 16),
                        ),
                      ],
              ),
              child: child,
            ),
          );
        },
      ),
    );
  }
}
