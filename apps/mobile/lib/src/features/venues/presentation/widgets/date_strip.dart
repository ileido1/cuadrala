import 'package:flutter/material.dart';

/// Horizontal scrollable strip of 7 days starting from today.
/// Each day shows the weekday abbreviation (Lun, Mar, ...) and the day number.
/// The selected day is highlighted with the primary color.
final class DateStrip extends StatelessWidget {
  const DateStrip({
    super.key,
    required this.selectedDate,
    required this.onDateSelected,
  });

  final DateTime selectedDate;
  final void Function(DateTime selectedDate) onDateSelected;

  static const _weekdayAbbr = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final days = List.generate(7, (i) {
      final d = today.add(Duration(days: i));
      return DateTime(d.year, d.month, d.day);
    });

    return SizedBox(
      key: const Key('date_strip'),
      height: 72,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: days.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final day = days[index];
          final isSelected = day.year == selectedDate.year &&
              day.month == selectedDate.month &&
              day.day == selectedDate.day;
          return DateStripItem(
            date: day,
            isSelected: isSelected,
            weekdayAbbr: _weekdayAbbr[day.weekday - 1],
            onTap: () => onDateSelected(day),
          );
        },
      ),
    );
  }
}

/// A single day cell in the DateStrip.
final class DateStripItem extends StatelessWidget {
  const DateStripItem({
    super.key,
    required this.date,
    required this.isSelected,
    required this.weekdayAbbr,
    required this.onTap,
  });

  final DateTime date;
  final bool isSelected;
  final String weekdayAbbr;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    final bgColor =
        isSelected ? colorScheme.primary : colorScheme.surfaceContainerHighest;
    final fgColor =
        isSelected ? colorScheme.onPrimary : colorScheme.onSurfaceVariant;

    return GestureDetector(
      key: isSelected ? const Key('date_strip_selected') : null,
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 48,
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              weekdayAbbr,
              style: textTheme.labelSmall?.copyWith(color: fgColor),
            ),
            const SizedBox(height: 4),
            Text(
              '${date.day}',
              style: textTheme.titleSmall?.copyWith(
                color: fgColor,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
