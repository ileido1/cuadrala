import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';
import 'package:cuadrala_mobile/src/core/theme/tournament_theme.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/tournament_primitives.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/tournament_status_pill.dart';
import 'package:cuadrala_mobile/src/shared/widgets/app_header.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/tournament_list_item_tile.dart';

void main() {
  for (final brightness in Brightness.values) {
    test(
      'should apply exact v2 tokens without changing global brand when $brightness',
      () {
        final base = brightness == Brightness.dark
            ? AppTheme.dark()
            : AppTheme.light();
        final theme = TournamentTheme.apply(base);
        expect(theme.colorScheme.primary, const Color(0xFF17A34A));
        expect(
          theme.colorScheme.surfaceContainerLow,
          brightness == Brightness.dark
              ? const Color(0xFF0F172A)
              : Colors.white,
        );
        expect(base.colorScheme.primary, const Color(0xFF1F9A4D));
        expect(theme.extension<TournamentTheme>(), isNotNull);
      },
    );
  }
  testWidgets(
    'should display missing data honestly and uncapped capacity when card has optional gaps',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: TournamentTheme.apply(AppTheme.dark()),
          home: const Scaffold(
            body: TournamentListItemTile(
              tournament: TournamentListItemDto(
                id: 't',
                name: 'Abierto',
                status: 'OPEN',
                sportName: 'Pádel',
                categoryId: 'c',
                categoryName: '7ma',
                startsAt: null,
                registrationCount: 5,
              ),
            ),
          ),
        ),
      );
      expect(find.text('Sin precio'), findsOneWidget);
      expect(find.text('Sede por definir'), findsOneWidget);
      expect(find.text('5 inscritos · sin tope'), findsOneWidget);
      expect(find.text('Horario por definir'), findsOneWidget);
    },
  );
  testWidgets(
    'should show short open label and participation state when requested',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: TournamentTheme.apply(AppTheme.dark()),
          home: const Scaffold(
            body: Column(
              children: [
                TournamentStatusPill(status: 'OPEN', short: true),
                TournamentViewerBadge(registrationStatus: 'PENDING'),
              ],
            ),
          ),
        ),
      );
      expect(find.text('Abierta'), findsOneWidget);
      expect(find.text('Pendiente'), findsOneWidget);
    },
  );
  testWidgets(
    'should allow content-width trailing without overflow when header action is wide',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AppHeader(
              title: 'Torneo',
              rightAction: SizedBox(
                width: 110,
                child: Text('Inscripción abierta'),
              ),
            ),
          ),
        ),
      );
      expect(tester.takeException(), isNull);
      expect(
        tester
            .getSize(
              find
                  .ancestor(
                    of: find.text('Inscripción abierta'),
                    matching: find.byType(SizedBox),
                  )
                  .first,
            )
            .width,
        greaterThanOrEqualTo(110),
      );
    },
  );
  testWidgets(
    'should clamp occupancy and use full tone when capacity is reached',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: TournamentTheme.apply(AppTheme.dark()),
          home: const Scaffold(
            body: TournamentCupoBar(count: 20, capacity: 16),
          ),
        ),
      );
      final indicator = tester.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator),
      );
      expect(indicator.value, 1);
      expect(indicator.minHeight, 5);
    },
  );
}
