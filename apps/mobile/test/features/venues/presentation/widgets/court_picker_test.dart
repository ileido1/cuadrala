import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/venues/data/models/court_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/slot_info.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/widgets/court_picker.dart';
import 'package:cuadrala_mobile/src/shared/widgets/selectable_chip.dart';

CourtDto _court({int durationMinutes = 60}) => CourtDto(
      id: 'court-1',
      venueId: 'venue-1',
      name: 'Pista 1',
      sportType: 'PADEL',
      indoor: true,
      lighting: true,
      status: 'ACTIVE',
      createdAt: DateTime(2024),
      pricePerHourCents: 10000,
      durationMinutes: durationMinutes,
    );

Widget _wrap(Widget child) => MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: child)),
    );

void main() {
  testWidgets(
    'renders available slots as selectable chips and occupied slots as '
    'disabled chips with a reason tooltip',
    (tester) async {
      const occupied = SlotInfo(
        scheduledAt: '2024-06-01T11:30:00.000Z',
        isAvailable: false,
        reason: 'OCCUPIED_MATCH',
      );
      const available = SlotInfo(
        scheduledAt: '2024-06-01T10:00:00.000Z',
        isAvailable: true,
      );

      await tester.pumpWidget(_wrap(CourtPicker(
        courts: [_court()],
        selectedCourtId: 'court-1',
        selectedSlot: null,
        slotsByCourtId: const {
          'court-1': [available, occupied],
        },
        loadingCourtId: null,
        dateLabel: 'SÁB 1',
        onSelectCourt: (_) {},
        onSelectSlot: (_) {},
        onChangeDate: () {},
      )));
      await tester.pump();

      // Ambos horarios visibles como chips.
      expect(find.text('10:00 - 11:00'), findsOneWidget);
      expect(find.text('11:30 - 12:30'), findsOneWidget);

      final chips = tester
          .widgetList<SelectableChip>(find.byType(SelectableChip))
          .toList();
      expect(chips, hasLength(2));

      // El chip disponible es seleccionable; el ocupado queda deshabilitado.
      final availableChip = chips.firstWhere((c) => !c.disabled);
      final occupiedChip = chips.firstWhere((c) => c.disabled);
      expect(availableChip.onTap, isNotNull);
      expect(occupiedChip.onTap, isNull);

      // El motivo se expone vía tooltip.
      final tooltip = tester.widget<Tooltip>(find.byType(Tooltip));
      expect(tooltip.message, 'Ocupado — partido');
    },
  );

  testWidgets(
    'shows the empty state instead of chips when no slots exist',
    (tester) async {
      await tester.pumpWidget(_wrap(CourtPicker(
        courts: [_court()],
        selectedCourtId: 'court-1',
        selectedSlot: null,
        slotsByCourtId: const {'court-1': []},
        loadingCourtId: null,
        dateLabel: 'SÁB 1',
        onSelectCourt: (_) {},
        onSelectSlot: (_) {},
        onChangeDate: () {},
      )));
      await tester.pump();

      expect(find.byType(SelectableChip), findsNothing);
      expect(find.textContaining('Sin horarios'), findsOneWidget);
    },
  );
}
