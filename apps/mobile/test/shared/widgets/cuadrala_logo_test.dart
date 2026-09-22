import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/shared/widgets/cuadrala_logo.dart';

void main() {
  Widget wrap({required Brightness brightness}) {
    return MaterialApp(
      theme: ThemeData(brightness: brightness),
      home: const Scaffold(body: CuadralaLogo()),
    );
  }

  testWidgets('should use the official bicolor logo in light mode', (
    tester,
  ) async {
    await tester.pumpWidget(wrap(brightness: Brightness.light));

    final image = tester.widget<Image>(find.byType(Image));
    final provider = image.image as AssetImage;

    expect(provider.assetName, 'assets/brand/logo-auth.png');
    expect(image.fit, BoxFit.contain);
    expect(find.bySemanticsLabel('Cuádrala'), findsOneWidget);
  });

  testWidgets('should use the official white logo in dark mode', (
    tester,
  ) async {
    await tester.pumpWidget(wrap(brightness: Brightness.dark));

    final image = tester.widget<Image>(find.byType(Image));
    final provider = image.image as AssetImage;

    expect(provider.assetName, 'assets/brand/logo-auth-dark.png');
  });
}
