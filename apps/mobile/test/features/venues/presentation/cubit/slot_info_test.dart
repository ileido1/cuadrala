import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/slot_info.dart';

void main() {
  group('SlotInfo', () {
    test('should be equal when scheduledAt, isAvailable and reason match', () {
      const a = SlotInfo(
        scheduledAt: '2024-06-01T10:00:00.000Z',
        isAvailable: false,
        reason: 'OCCUPIED_MATCH',
      );
      const b = SlotInfo(
        scheduledAt: '2024-06-01T10:00:00.000Z',
        isAvailable: false,
        reason: 'OCCUPIED_MATCH',
      );
      expect(a, b);
    });

    test('should differ when reason differs', () {
      const a = SlotInfo(
        scheduledAt: '2024-06-01T10:00:00.000Z',
        isAvailable: false,
        reason: 'OCCUPIED_MATCH',
      );
      const b = SlotInfo(
        scheduledAt: '2024-06-01T10:00:00.000Z',
        isAvailable: false,
        reason: 'OCCUPIED_RESERVATION',
      );
      expect(a, isNot(b));
    });

    test('should map each occupied reason to a Spanish label', () {
      const cases = <String, String>{
        'OCCUPIED_MATCH': 'Ocupado — partido',
        'OCCUPIED_RESERVATION': 'Ocupado — reserva',
        'INCOMPATIBLE_VACANT_HOUR': 'Horario incompatible',
        'OUT_OF_RANGE': 'Fuera de rango',
        'OUT_OF_OPENING_HOURS': 'Fuera de horario',
      };
      cases.forEach((reason, expected) {
        expect(
          SlotInfo(
            scheduledAt: 'x',
            isAvailable: false,
            reason: reason,
          ).reasonLabel,
          expected,
          reason: 'label for $reason',
        );
      });
    });

    test('should return null reasonLabel for available slots', () {
      const slot = SlotInfo(scheduledAt: 'x', isAvailable: true);
      expect(slot.reasonLabel, isNull);
    });

    test('should return null reasonLabel when no reason is provided', () {
      const slot = SlotInfo(scheduledAt: 'x', isAvailable: false);
      expect(slot.reasonLabel, isNull);
    });
  });
}
