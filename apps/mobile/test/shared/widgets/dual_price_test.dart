import 'package:cuadrala_mobile/src/core/models/currency_code.dart';
import 'package:cuadrala_mobile/src/shared/widgets/dual_price.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Widget harness(Widget child) =>
      MaterialApp(home: Scaffold(body: Center(child: child)));

  testWidgets('should render only primary label when secondary is null',
      (tester) async {
    await tester.pumpWidget(harness(const DualPrice(primaryLabel: 'US\$8')));

    expect(find.text('US\$8'), findsOneWidget);
  });

  testWidgets('should render primary and secondary labels', (tester) async {
    await tester.pumpWidget(
      harness(const DualPrice(primaryLabel: 'US\$8', secondaryLabel: 'Bs 320')),
    );

    expect(find.text('US\$8'), findsOneWidget);
    expect(find.text('Bs 320'), findsOneWidget);
  });

  testWidgets('fromMinor should format primary and secondary from cents',
      (tester) async {
    await tester.pumpWidget(
      harness(
        DualPrice.fromMinor(
          primaryMinor: 800,
          primaryCurrency: CurrencyCode.usd,
          secondaryMinor: 32000,
        ),
      ),
    );

    expect(find.text('US\$ 8.00'), findsOneWidget);
    expect(find.text('Bs. 320.00'), findsOneWidget);
  });

  testWidgets('fromMinor should omit secondary when secondaryMinor is null',
      (tester) async {
    await tester.pumpWidget(
      harness(
        DualPrice.fromMinor(
          primaryMinor: 1000,
          primaryCurrency: CurrencyCode.usd,
        ),
      ),
    );

    expect(find.text('US\$ 10.00'), findsOneWidget);
    expect(find.textContaining('Bs'), findsNothing);
  });
}
