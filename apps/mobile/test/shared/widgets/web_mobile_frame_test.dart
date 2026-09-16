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
        const Size(388, 998),
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
        const Size(318, 1200),
      );
      expect(tester.takeException(), isNull);
    });
  });
}
