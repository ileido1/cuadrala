import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';

const quickMatchGoldenKey = Key('quick_match.golden');

Future<void> loadQuickMatchGoldenFonts() async {
  final font = FontLoader(AppTheme.plusJakartaFontFamily);
  for (final weight in [400, 600, 700, 800]) {
    font.addFont(rootBundle.load('assets/fonts/PlusJakartaSans-$weight.ttf'));
  }
  await font.load();
  final icons = FontLoader('packages/phosphor_flutter/PhosphorLight');
  icons.addFont(
    rootBundle.load('packages/phosphor_flutter/lib/fonts/Phosphor-Light.ttf'),
  );
  await icons.load();
}

/// Fixed physical pixels and scale, same convention as
/// `tournaments/goldens/tournament_golden.dart`.
Future<void> pumpQuickMatchGolden(
  WidgetTester tester, {
  required Widget child,
  required Brightness brightness,
}) async {
  tester.view.physicalSize = const Size(402, 874);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      locale: const Locale('es'),
      theme: brightness == Brightness.dark ? AppTheme.dark() : AppTheme.light(),
      home: RepaintBoundary(key: quickMatchGoldenKey, child: child),
    ),
  );
  await tester.pump();
}
