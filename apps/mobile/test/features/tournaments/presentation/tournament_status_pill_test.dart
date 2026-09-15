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
      expect(decoration.color, isNot(BrandColors.dangerRed));
    });

    //? Fidelidad completa por estado (`design_handoff_torneos/README.md:58`,
    //? `cuadrala-torneos.jsx:21-27`, TSTATUS): antes sólo IN_PROGRESS tenía
    //? una aserción de color, y DRAFT/COMPLETED caían en el `default` sin
    //? ninguna rama explícita que probara que su gris es intencional.
    testWidgets('should paint every status with its exact handoff colors',
        (tester) async {
      await pump(tester, 'DRAFT');
      final scheme = Theme.of(
        tester.element(find.byType(TournamentStatusPill)),
      ).colorScheme;

      Future<(Color, Color)> paint(String status) async {
        await pump(tester, status);
        final container = tester.widget<Container>(
          find.byKey(const Key('tournament.status.pill')),
        );
        final decoration = container.decoration! as BoxDecoration;
        final text = tester.widget<Text>(
          find.text(tournamentStatusLabel(status)),
        );
        return (decoration.color!, text.style!.color!);
      }

      final draft = await paint('DRAFT');
      expect(draft.$1, scheme.surfaceContainerHighest);
      expect(draft.$2, scheme.onSurfaceVariant);

      final open = await paint('OPEN');
      expect(open.$1, scheme.primary.withValues(alpha: 0.15));
      expect(open.$2, scheme.primary);

      final inProgress = await paint('IN_PROGRESS');
      expect(inProgress.$1, BrandColors.limeAccent);
      expect(inProgress.$2, BrandColors.onLime);

      final completed = await paint('COMPLETED');
      expect(completed.$1, scheme.surfaceContainerHighest);
      expect(completed.$2, scheme.onSurfaceVariant);

      final cancelled = await paint('CANCELLED');
      expect(cancelled.$1, BrandColors.dangerRed.withValues(alpha: 0.16));
      expect(cancelled.$2, BrandColors.dangerRed);
    });

    testWidgets('should fall back to a readable label for an unknown status',
        (tester) async {
      await pump(tester, 'WAT');

      expect(find.text('Estado desconocido'), findsOneWidget);
      expect(find.text('WAT'), findsNothing);
    });
  });
}
