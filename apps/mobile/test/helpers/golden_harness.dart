import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';

/// Key of the RepaintBoundary that every golden captures.
const goldenKey = Key('golden');

/// Loads the real app fonts (Plus Jakarta + Phosphor icons) and the `es_ES`
/// date symbols, so goldens render text instead of placeholder blocks.
/// Call once from `setUpAll`.
Future<void> loadGoldenFonts() async {
  await initializeDateFormatting('es_ES');
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

/// Pumps [child] inside a themed MaterialApp at a fixed 402x874 logical size
/// and scale 1, the same convention as the per-module golden helpers in
/// `matches/`, `quick_match/` and `tournaments/`. Fixtures must use fixed
/// dates so goldens stay deterministic.
Future<void> pumpGolden(
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
      home: RepaintBoundary(key: goldenKey, child: child),
    ),
  );
  await tester.pump();
}
