import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'src/app/app.dart';
import 'src/core/di/service_locator.dart';
import 'src/core/push/push_token_sync_service.dart';

Future<void> main() async {
  final isProduction = const bool.fromEnvironment('dart.vm.product');

  await SentryFlutter.init(
    (options) {
      options.dsn = const String.fromEnvironment('SENTRY_DSN');
      options.sendDefaultPii = true;
      options.environment = isProduction ? 'production' : 'development';
      options.debug = !isProduction;

      // Tracing: lower sample rate in production to control event volume.
      options.tracesSampleRate = isProduction ? 0.2 : 1.0;

      // Session Replay (iOS/Android only, experimental in sentry_flutter
      // 8.x): sample normal sessions lightly, always replay error sessions.
      options.experimental.replay.sessionSampleRate = isProduction
          ? 0.05
          : 0.1;
      options.experimental.replay.onErrorSampleRate = 1.0;
    },
    appRunner: () async {
      WidgetsFlutterBinding.ensureInitialized();
      //? Los DateFormat con locale 'es_ES' (detalle/listado de torneos) requieren
      //? que los símbolos de fecha estén inicializados antes de formatear.
      await initializeDateFormatting('es_ES', null);
      await setupDependencies();
      await getIt<PushTokenSyncService>().initialize();
      // REQUIRED by sentry_flutter: wraps the root widget to enable
      // screenshots, replay, and user-interaction tracing.
      runApp(SentryWidget(child: const App()));
    },
  );
}
