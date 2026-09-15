import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/domain/tournament_status_transitions.dart';

void main() {
  group('enabledStatusOptions', () {
    test('should keep DRAFT enabled and allow opening registrations', () {
      expect(enabledStatusOptions('DRAFT'), {'DRAFT', 'OPEN'});
    });

    test('should keep OPEN enabled and allow starting the tournament', () {
      expect(enabledStatusOptions('OPEN'), {'OPEN', 'IN_PROGRESS'});
    });

    test(
      'should keep terminal and in-progress statuses as their only option',
      () {
        for (final status in ['IN_PROGRESS', 'COMPLETED', 'CANCELLED']) {
          expect(enabledStatusOptions(status), {status});
        }
      },
    );
  });
}
