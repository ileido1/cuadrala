import 'package:flutter/material.dart';

import 'src/app/app.dart';
import 'src/core/di/service_locator.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await setupDependencies();
  runApp(const App());
}
