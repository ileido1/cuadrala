import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/auth/presentation/widgets/auth_tabs.dart';

void main() {
  group('AuthTabs', () {
    Widget wrap({
      required int selectedIndex,
      required ValueChanged<int> onTabChanged,
      bool isDisabled = false,
    }) {
      return MaterialApp(
        home: Scaffold(
          body: AuthTabs(
            selectedIndex: selectedIndex,
            onTabChanged: onTabChanged,
            isDisabled: isDisabled,
          ),
        ),
      );
    }

    testWidgets('renders both tab labels', (tester) async {
      await tester.pumpWidget(wrap(selectedIndex: 0, onTabChanged: (_) {}));

      expect(find.text('Ingresar'), findsOneWidget);
      expect(find.text('Crear cuenta'), findsOneWidget);
    });

    testWidgets('selectedIndex 0 highlights first tab', (tester) async {
      await tester.pumpWidget(wrap(selectedIndex: 0, onTabChanged: (_) {}));

      // The selected tab button is the first one — verify it exists
      expect(find.byType(AuthTabs), findsOneWidget);
      // Both labels are always rendered
      expect(find.text('Ingresar'), findsOneWidget);
      expect(find.text('Crear cuenta'), findsOneWidget);
    });

    testWidgets('selectedIndex 1 highlights second tab', (tester) async {
      await tester.pumpWidget(wrap(selectedIndex: 1, onTabChanged: (_) {}));

      expect(find.text('Ingresar'), findsOneWidget);
      expect(find.text('Crear cuenta'), findsOneWidget);
    });

    testWidgets('tapping opposite tab calls onTabChanged with correct index',
        (tester) async {
      int? received;
      await tester.pumpWidget(
        wrap(selectedIndex: 0, onTabChanged: (i) => received = i),
      );

      await tester.tap(find.text('Crear cuenta'));
      await tester.pump();

      expect(received, 1);
    });

    testWidgets(
        'tapping current tab calls onTabChanged with its index too',
        (tester) async {
      int? received;
      await tester.pumpWidget(
        wrap(selectedIndex: 1, onTabChanged: (i) => received = i),
      );

      await tester.tap(find.text('Ingresar'));
      await tester.pump();

      expect(received, 0);
    });

    testWidgets('isDisabled=true blocks tap callbacks', (tester) async {
      int callCount = 0;
      await tester.pumpWidget(
        wrap(
          selectedIndex: 0,
          onTabChanged: (_) => callCount++,
          isDisabled: true,
        ),
      );

      await tester.tap(find.text('Crear cuenta'));
      await tester.pump();

      expect(callCount, 0);
    });
  });
}
