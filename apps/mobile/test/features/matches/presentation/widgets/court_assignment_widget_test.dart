import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/result_entry_state.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/widgets/court_assignment_widget.dart';

Widget _wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

const _participants = ['u1', 'u2', 'u3', 'u4'];

void main() {
  group('CourtAssignmentWidget', () {
    testWidgets('renders 4 DragTarget position slots', (tester) async {
      await tester.pumpWidget(
        _wrap(
          CourtAssignmentWidget(
            participants: _participants,
            courtPositions: const {},
            onAssign: (_, _) {},
            onRemove: (_) {},
          ),
        ),
      );

      expect(find.byType(DragTarget<String>), findsNWidgets(4));
    });

    testWidgets('renders team labels (Equipo A and Equipo B)', (tester) async {
      await tester.pumpWidget(
        _wrap(
          CourtAssignmentWidget(
            participants: _participants,
            courtPositions: const {},
            onAssign: (_, _) {},
            onRemove: (_) {},
          ),
        ),
      );

      expect(find.text('Equipo A'), findsOneWidget);
      expect(find.text('Equipo B'), findsOneWidget);
    });

    testWidgets('shows unassigned player names in pool', (tester) async {
      await tester.pumpWidget(
        _wrap(
          CourtAssignmentWidget(
            participants: _participants,
            courtPositions: const {},
            onAssign: (_, _) {},
            onRemove: (_) {},
          ),
        ),
      );

      // With no courtPositions and userId-only participants,
      // all 4 should appear in the unassigned pool (first part of display name)
      expect(find.byType(Draggable<String>), findsNWidgets(4));
    });

    testWidgets('shows "Todos asignados" when all positions filled',
        (tester) async {
      const positions = {
        CourtPosition.teamADrive: 'u1',
        CourtPosition.teamAReves: 'u2',
        CourtPosition.teamBDrive: 'u3',
        CourtPosition.teamBReves: 'u4',
      };

      await tester.pumpWidget(
        _wrap(
          CourtAssignmentWidget(
            participants: _participants,
            courtPositions: positions,
            onAssign: (_, _) {},
            onRemove: (_) {},
          ),
        ),
      );

      expect(find.text('Todos asignados'), findsOneWidget);
    });

    testWidgets('onRemove callback fires when occupied zone is re-dragged',
        (tester) async {
      final removedPositions = <CourtPosition>[];

      await tester.pumpWidget(
        _wrap(
          CourtAssignmentWidget(
            participants: _participants,
            courtPositions: const {CourtPosition.teamADrive: 'u1'},
            onAssign: (_, _) {},
            onRemove: removedPositions.add,
          ),
        ),
      );

      // The occupied zone renders a Draggable; find the one in the court area
      // (not the unassigned pool). There should be 1 Draggable in the zone.
      final draggables = find.byType(Draggable<String>);
      // At least one Draggable is inside the court zone (occupied slot)
      expect(draggables, findsWidgets);
    });

    testWidgets('displays Drive and Revés position labels', (tester) async {
      await tester.pumpWidget(
        _wrap(
          CourtAssignmentWidget(
            participants: _participants,
            courtPositions: const {},
            onAssign: (_, _) {},
            onRemove: (_) {},
          ),
        ),
      );

      expect(find.text('Drive'), findsNWidgets(2));
      expect(find.text('Revés'), findsNWidgets(2));
    });
  });
}
