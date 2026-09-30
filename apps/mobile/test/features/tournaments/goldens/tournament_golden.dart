import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';
import 'package:cuadrala_mobile/src/core/theme/tournament_theme.dart';

const tournamentGoldenKey = Key('tournament.golden');

Future<void> loadTournamentGoldenFonts() async {
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

/// Fixed physical pixels, scale and locale; fixtures must use fixed dates.
Future<void> pumpTournamentGolden(
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
      theme: TournamentTheme.apply(
        brightness == Brightness.dark ? AppTheme.dark() : AppTheme.light(),
      ),
      home: RepaintBoundary(key: tournamentGoldenKey, child: child),
    ),
  );
  await tester.pump();
}
