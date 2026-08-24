import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'src/app/app.dart';
import 'src/core/di/service_locator.dart';
import 'src/core/push/push_token_sync_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  //? Los DateFormat con locale 'es_ES' (detalle/listado de torneos) requieren
  //? que los símbolos de fecha estén inicializados antes de formatear.
  await initializeDateFormatting('es_ES', null);
  await setupDependencies();
  await getIt<PushTokenSyncService>().initialize();
  runApp(const App());
}
