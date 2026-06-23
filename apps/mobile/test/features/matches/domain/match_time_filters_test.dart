import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/matches/data/models/open_match_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/domain/match_time_filters.dart';

OpenMatchDto _match({
  String id = 'm',
  String status = 'SCHEDULED',
  DateTime? scheduledAt,
}) =>
    OpenMatchDto(
      id: id,
      sportId: 'sport-1',
      categoryId: 'cat-1',
      status: status,
      scheduledAt: scheduledAt,
      pricePerPlayerCents: 1000,
      maxParticipants: 4,
      participantCount: 1,
      openSpots: 3,
      clubName: 'Club',
      courtName: 'Cancha 1',
      locationLabel: 'BA',
    );

void main() {
  final now = DateTime(2026, 6, 22, 12, 0);

  group('isUpcomingMatch', () {
    test('returns true when scheduledAt is in the future', () {
      final m = _match(scheduledAt: now.add(const Duration(hours: 1)));
      expect(isUpcomingMatch(m, now: now), isTrue);
    });

    test('returns true when scheduledAt is null', () {
      expect(isUpcomingMatch(_match(scheduledAt: null), now: now), isTrue);
    });

    test('returns true exactly at the 2h grace boundary', () {
      final m = _match(scheduledAt: now.subtract(const Duration(hours: 2)));
      expect(isUpcomingMatch(m, now: now), isTrue);
    });

    test('returns false just past the 2h grace boundary', () {
      final m = _match(
        scheduledAt: now.subtract(const Duration(hours: 2, minutes: 1)),
      );
      expect(isUpcomingMatch(m, now: now), isFalse);
    });

    test('returns false for FINISHED regardless of future date', () {
      final m = _match(
        status: 'FINISHED',
        scheduledAt: now.add(const Duration(hours: 1)),
      );
      expect(isUpcomingMatch(m, now: now), isFalse);
    });

    test('returns false for CANCELLED regardless of future date', () {
      final m = _match(
        status: 'cancelled',
        scheduledAt: now.add(const Duration(hours: 1)),
      );
      expect(isUpcomingMatch(m, now: now), isFalse);
    });
  });

  group('isHistoryMatch', () {
    test('is the exact complement of isUpcomingMatch', () {
      final samples = <OpenMatchDto>[
        _match(scheduledAt: now.add(const Duration(hours: 1))),
        _match(scheduledAt: now.subtract(const Duration(hours: 3))),
        _match(scheduledAt: null),
        _match(status: 'FINISHED', scheduledAt: now),
        _match(status: 'CANCELLED', scheduledAt: null),
      ];
      for (final m in samples) {
        expect(isHistoryMatch(m, now: now), !isUpcomingMatch(m, now: now));
      }
    });
  });

  group('byScheduledAtAscNullsLast', () {
    test('orders ascending and puts nulls at the end', () {
      final list = <OpenMatchDto>[
        _match(id: 'null', scheduledAt: null),
        _match(id: 'late', scheduledAt: now.add(const Duration(hours: 5))),
        _match(id: 'soon', scheduledAt: now.add(const Duration(hours: 1))),
      ]..sort(byScheduledAtAscNullsLast);

      expect(list.map((m) => m.id).toList(), ['soon', 'late', 'null']);
    });
  });
}
