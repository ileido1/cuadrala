import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/venue/opening_hours.dart';

const _hours = {
  'monday': OpeningHoursDay(open: '08:00', close: '23:00'),
  'tuesday': OpeningHoursDay(open: '08:00', close: '23:00'),
  'wednesday': OpeningHoursDay(open: '08:00', close: '23:00'),
  'thursday': OpeningHoursDay(open: '08:00', close: '23:00'),
  'friday': OpeningHoursDay(open: '08:00', close: '23:00'),
  'saturday': OpeningHoursDay(open: '08:00', close: '23:00'),
};

void main() {
  group('opening_hours', () {
    test('should treat sunday as closed when absent from openingHours', () {
      expect(dayKeyFromIsoDate('2026-05-17'), 'sunday');
      expect(isVenueOpenOnDate('2026-05-17', _hours), isFalse);
      expect(getDayHoursForDate('2026-05-17', _hours), isNull);
      expect(closedDayMessage('2026-05-17', _hours), contains('Domingo'));
    });

    test('should close sunday when openingHours is null', () {
      expect(isVenueOpenOnDate('2026-05-17', null), isFalse);
      expect(isVenueOpenOnDate('2026-05-18', null), isTrue);
    });

    test('should validate time within day hours', () {
      final h = getDayHoursForDate('2026-05-18', _hours)!;
      expect(
        validateTimeWithinDayHours('10:00', 90, h.openMinutes, h.closeMinutes),
        isNull,
      );
      expect(
        validateTimeWithinDayHours('22:30', 90, h.openMinutes, h.closeMinutes),
        isNotNull,
      );
    });
  });
}
