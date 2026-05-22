import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/auth/presentation/widgets/google_g_logo.dart';

void main() {
  group('GoogleGLogo', () {
    Widget wrap({double size = 20}) {
      return MaterialApp(
        home: Scaffold(
          body: Center(child: GoogleGLogo(size: size)),
        ),
      );
    }

    testWidgets('renders without exception at size 16', (tester) async {
      await tester.pumpWidget(wrap(size: 16));
      expect(find.byType(GoogleGLogo), findsOneWidget);
    });

    testWidgets('renders without exception at default size 20', (tester) async {
      await tester.pumpWidget(wrap());
      expect(find.byType(GoogleGLogo), findsOneWidget);
    });

    testWidgets('renders without exception at size 40', (tester) async {
      await tester.pumpWidget(wrap(size: 40));
      expect(find.byType(GoogleGLogo), findsOneWidget);
    });

    testWidgets('finds exactly one GoogleGLogo widget', (tester) async {
      await tester.pumpWidget(wrap());
      expect(find.byType(GoogleGLogo), findsOneWidget);
    });
  });
}
