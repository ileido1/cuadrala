import 'package:flutter/material.dart';

import 'src/app/app.dart';
import 'src/core/di/service_locator.dart';
import 'src/core/push/push_token_sync_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await setupDependencies();
  await getIt<PushTokenSyncService>().initialize();
  runApp(const App());
}
