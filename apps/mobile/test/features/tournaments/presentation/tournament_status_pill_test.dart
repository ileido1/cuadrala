import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/theme/brand_colors.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournament_status_view.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/tournament_status_pill.dart';

void main() {
  Future<void> pump(WidgetTester tester, String status) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: TournamentStatusPill(status: status)),
      ),
    );
  }

  group('TournamentStatusPill', () {
    //? La tarjeta del listado traducía REGISTRATION_OPEN / REGISTRATION_CLOSED /
    //? FINISHED, que no existen en el enum de la API. OPEN y COMPLETED caían en
    //? el default y al usuario le aparecía el enum crudo en la lista.
    testWidgets('should label every status the API can return', (tester) async {
      for (final status in tournamentStatuses) {
        await pump(tester, status);

        expect(
          find.text(tournamentStatusLabel(status)),
          findsOneWidget,
          reason: 'Falta la etiqueta de $status',
        );
      }
    });

    testWidgets('should never show a raw enum value', (tester) async {
      for (final status in tournamentStatuses) {
        await pump(tester, status);

        expect(find.text(status), findsNothing, reason: '$status salió crudo');
      }
    });

    //? "En juego" es el único estado que el diseño pinta sobre lima; el resto
    //? va sobre fondos neutros o el verde de marca. Si el fondo se cae, el
    //? texto casi negro queda ilegible.
    testWidgets('should paint IN_PROGRESS on lime', (tester) async {
      await pump(tester, 'IN_PROGRESS');

      final container = tester.widget<Container>(
        find.byKey(const Key('tournament.status.pill')),
      );
      final decoration = container.decoration! as BoxDecoration;

      expect(decoration.color, BrandColors.limeAccent);
    });

    testWidgets('should fall back to a readable label for an unknown status',
        (tester) async {
      await pump(tester, 'WAT');

      expect(find.text('Estado desconocido'), findsOneWidget);
      expect(find.text('WAT'), findsNothing);
    });
  });
}
