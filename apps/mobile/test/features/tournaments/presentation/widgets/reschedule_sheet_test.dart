import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/reschedule_sheet.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/court_dto.dart';
import 'package:cuadrala_mobile/src/shared/widgets/date_strip.dart';

void main() {
  CourtDto court(String id, String name) => CourtDto(
    id: id,
    venueId: 'venue-1',
    name: name,
    sportType: 'PADEL',
    indoor: false,
    lighting: true,
    status: 'ACTIVE',
    createdAt: DateTime(2026),
    pricePerHourCents: 0,
    durationMinutes: 90,
  );
  final days = [
    DateStripDay(date: DateTime(2026, 9, 16), offset: 0),
    DateStripDay(date: DateTime(2026, 9, 17), offset: 1),
  ];
  final courts = [
    court('court-1', 'Cancha Central'),
    court('court-2', 'Cancha 2'),
  ];

  Future<void> pumpSheet(
    WidgetTester tester, {
    required Future<void> Function({
      required String courtId,
      required DateTime scheduledAt,
    })
    onSubmit,
  }) {
    return tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: RescheduleSheet(
            courts: courts,
            days: days,
            timeOptions: const [
              TimeOfDay(hour: 9, minute: 0),
              TimeOfDay(hour: 10, minute: 30),
            ],
            onSubmit: onSubmit,
          ),
        ),
      ),
    );
  }

  testWidgets('shows DateStrip, venue courts and time chips', (tester) async {
    await pumpSheet(
      tester,
      onSubmit: ({required courtId, required scheduledAt}) async {},
    );

    expect(find.byType(DateStrip), findsOneWidget);
    expect(find.text('Cancha Central'), findsOneWidget);
    expect(find.text('Cancha 2'), findsOneWidget);
    expect(find.text('09:00'), findsOneWidget);
    expect(find.text('10:30'), findsOneWidget);
  });

  testWidgets('submits the selected court and wall-clock slot', (tester) async {
    String? submittedCourtId;
    DateTime? submittedAt;
    await pumpSheet(
      tester,
      onSubmit: ({required courtId, required scheduledAt}) async {
        submittedCourtId = courtId;
        submittedAt = scheduledAt;
      },
    );

    await tester.tap(find.text('17'));
    await tester.pump();
    await tester.tap(
      find.byKey(const Key('tournament.rescheduleSheet.court.court-2')),
    );
    await tester.pump();
    await tester.tap(
      find.byKey(const Key('tournament.rescheduleSheet.time.10:30')),
    );
    await tester.pump();
    await tester.tap(
      find.byKey(const Key('tournament.rescheduleSheet.submit')),
    );
    await tester.pumpAndSettle();

    expect(submittedCourtId, 'court-2');
    expect(submittedAt, DateTime.utc(2026, 9, 17, 10, 30));
  });
}
