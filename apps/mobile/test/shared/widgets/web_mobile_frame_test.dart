import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/app/app.dart';

void main() {
  group('WebMobileFrame', () {
    testWidgets('caps width but fills the available browser height', (
      tester,
    ) async {
      await tester.binding.setSurfaceSize(const Size(1200, 1000));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        Theme(
          data: ThemeData.dark(),
          child: const WebMobileFrame(
            child: SizedBox.expand(key: ValueKey('content')),
          ),
        ),
      );

      expect(
        tester.getSize(find.byKey(const ValueKey('content'))),
        const Size(390, 1000),
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('shrinks with a smaller browser viewport', (tester) async {
      await tester.binding.setSurfaceSize(const Size(320, 600));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        Theme(
          data: ThemeData.dark(),
          child: const WebMobileFrame(
            child: SingleChildScrollView(
              child: SizedBox(height: 1200, key: ValueKey('content')),
            ),
          ),
        ),
      );

      expect(
        tester.getSize(find.byKey(const ValueKey('content'))),
        const Size(320, 1200),
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('uses the full width on phone-sized browser viewports', (
      tester,
    ) async {
      await tester.binding.setSurfaceSize(const Size(430, 900));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        Theme(
          data: ThemeData.dark(),
          child: const WebMobileFrame(
            child: SizedBox.expand(key: ValueKey('content')),
          ),
        ),
      );

      expect(
        tester.getSize(find.byKey(const ValueKey('content'))),
        const Size(430, 900),
      );
      expect(tester.takeException(), isNull);
    });
  });
}
