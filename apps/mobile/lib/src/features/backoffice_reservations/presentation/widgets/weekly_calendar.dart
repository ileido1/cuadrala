import 'package:flutter/material.dart';

import '../../data/models/reservation_dto.dart';
import '../cubit/backoffice_reservations_state.dart';

final class WeeklyCalendar extends StatelessWidget {
  const WeeklyCalendar({
    super.key,
    required this.state,
    required this.onPreviousWeek,
    required this.onNextWeek,
    required this.onSlotTap,
    required this.onReservationTap,
  });

  final BackofficeReservationsState state;
  final VoidCallback onPreviousWeek;
  final VoidCallback onNextWeek;
  final void Function(String? courtId, DateTime date, String startTime) onSlotTap;
  final void Function(ReservationDto reservation) onReservationTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _CalendarNavigation(
          weekStart: state.weekStart,
          weekEnd: state.weekEnd,
          onPrevious: onPreviousWeek,
          onNext: onNextWeek,
        ),
        Expanded(
          child: _CalendarGrid(
            weekStart: state.weekStart,
            reservations: state.reservations,
            onSlotTap: onSlotTap,
            onReservationTap: onReservationTap,
          ),
        ),
      ],
    );
  }
}

final class _CalendarNavigation extends StatelessWidget {
  const _CalendarNavigation({
    required this.weekStart,
    required this.weekEnd,
    required this.onPrevious,
    required this.onNext,
  });

  final DateTime weekStart;
  final DateTime weekEnd;
  final VoidCallback onPrevious;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final months = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).colorScheme.outlineVariant,
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: onPrevious,
            tooltip: 'Semana anterior',
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${weekStart.day} ${months[weekStart.month - 1]} – ${weekEnd.day} ${months[weekEnd.month - 1]}',
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Semana del ${weekStart.year}',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: onNext,
            tooltip: 'Próxima semana',
          ),
        ],
      ),
    );
  }
}

final class _CalendarGrid extends StatelessWidget {
  const _CalendarGrid({
    required this.weekStart,
    required this.reservations,
    required this.onSlotTap,
    required this.onReservationTap,
  });

  final DateTime weekStart;
  final List<ReservationDto> reservations;
  final void Function(String? courtId, DateTime date, String startTime) onSlotTap;
  final void Function(ReservationDto reservation) onReservationTap;

  static const _dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  static const _timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00',
  ];

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);

    return SingleChildScrollView(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Time column
          SizedBox(
            width: 56,
            child: Column(
              children: [
                const SizedBox(height: 48), // Header offset
                ..._timeSlots.map((time) => SizedBox(
                  height: 60,
                  child: Center(
                    child: Text(
                      time,
                      style: TextStyle(
                        fontSize: 11,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                )),
              ],
            ),
          ),
          // Day columns
          ...List.generate(7, (dayIndex) {
            final date = weekStart.add(Duration(days: dayIndex));
            final isToday = date.year == todayDate.year &&
                date.month == todayDate.month &&
                date.day == todayDate.day;

            return Expanded(
              child: _DayColumn(
                date: date,
                isToday: isToday,
                reservations: _reservationsForDay(date),
                timeSlots: _timeSlots,
                onSlotTap: onSlotTap,
                onReservationTap: onReservationTap,
              ),
            );
          }),
        ],
      ),
    );
  }

  List<ReservationDto> _reservationsForDay(DateTime date) {
    final dateStr = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    return reservations.where((r) => r.date == dateStr).toList();
  }
}

final class _DayColumn extends StatelessWidget {
  const _DayColumn({
    required this.date,
    required this.isToday,
    required this.reservations,
    required this.timeSlots,
    required this.onSlotTap,
    required this.onReservationTap,
  });

  final DateTime date;
  final bool isToday;
  final List<ReservationDto> reservations;
  final List<String> timeSlots;
  final void Function(String? courtId, DateTime date, String startTime) onSlotTap;
  final void Function(ReservationDto reservation) onReservationTap;

  static const _dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Day header
        Container(
          height: 48,
          decoration: BoxDecoration(
            color: isToday
                ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.1)
                : null,
            border: Border(
              bottom: BorderSide(
                color: Theme.of(context).colorScheme.outlineVariant,
              ),
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                _dayLabels[date.weekday - 1],
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                  color: isToday
                      ? Theme.of(context).colorScheme.primary
                      : Theme.of(context).colorScheme.onSurface,
                ),
              ),
              Text(
                '${date.day}',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                  color: isToday
                      ? Theme.of(context).colorScheme.primary
                      : null,
                ),
              ),
            ],
          ),
        ),
        // Time slots
        ...timeSlots.map((time) => _TimeSlotCell(
          date: date,
          time: time,
          reservation: _reservationAt(time),
          onTap: () => onSlotTap(null, date, time),
          onReservationTap: onReservationTap,
        )),
      ],
    );
  }

  ReservationDto? _reservationAt(String time) {
    for (final res in reservations) {
      if (res.startTime == time) {
        return res;
      }
    }
    return null;
  }
}

final class _TimeSlotCell extends StatelessWidget {
  const _TimeSlotCell({
    required this.date,
    required this.time,
    required this.reservation,
    required this.onTap,
    required this.onReservationTap,
  });

  final DateTime date;
  final String time;
  final ReservationDto? reservation;
  final VoidCallback onTap;
  final void Function(ReservationDto) onReservationTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: reservation != null ? () => onReservationTap(reservation!) : onTap,
      child: Container(
        height: 60,
        decoration: BoxDecoration(
          color: reservation != null ? _colorForType(reservation!.type) : null,
          border: Border.all(
            color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: 0.5),
            width: 0.5,
          ),
        ),
        child: reservation != null
            ? Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      reservation!.courtName,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '${reservation!.startTime}–${reservation!.endTime}',
                      style: const TextStyle(
                        fontSize: 9,
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ),
              )
            : null,
      ),
    );
  }

  Color _colorForType(ReservationType type) {
    return switch (type) {
      ReservationType.reservation => Colors.blue,
      ReservationType.blocked => Colors.grey,
      ReservationType.tournament => Colors.green,
    };
  }
}