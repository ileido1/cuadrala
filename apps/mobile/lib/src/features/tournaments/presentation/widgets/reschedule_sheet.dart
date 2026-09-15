import 'package:flutter/material.dart';

import '../../../../core/theme/app_icons.dart';
import '../../../../shared/widgets/date_strip.dart';
import '../../../../shared/widgets/selectable_chip.dart';
import '../../../venues/data/models/court_dto.dart';

final class RescheduleSheet extends StatefulWidget {
  const RescheduleSheet({
    super.key,
    required this.courts,
    required this.onSubmit,
    this.days,
    this.timeOptions = _defaultTimeOptions,
  });

  final List<CourtDto> courts;
  final List<DateStripDay>? days;
  final List<TimeOfDay> timeOptions;
  final Future<void> Function({
    required String courtId,
    required DateTime scheduledAt,
  })
  onSubmit;

  static const _defaultTimeOptions = <TimeOfDay>[
    TimeOfDay(hour: 8, minute: 0),
    TimeOfDay(hour: 16, minute: 0),
    TimeOfDay(hour: 19, minute: 0),
  ];

  @override
  State<RescheduleSheet> createState() => _RescheduleSheetState();
}

class _RescheduleSheetState extends State<RescheduleSheet> {
  late final List<DateStripDay> _days = widget.days ?? buildDateStripDays(28);
  late String _dateKey = _days.first.key;
  String? _courtId;
  TimeOfDay? _time;
  bool _submitting = false;

  Future<void> _submitSV() async {
    final courtId = _courtId;
    final time = _time;
    if (courtId == null || time == null) return;

    final date = _days.firstWhere((day) => day.key == _dateKey).date;
    final scheduledAt = DateTime.utc(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    setState(() {
      _submitting = true;
    });

    try {
      await widget.onSubmit(courtId: courtId, scheduledAt: scheduledAt);
      if (!mounted) return;
      final popped = await Navigator.of(context).maybePop();
      if (!popped && mounted) setState(() => _submitting = false);
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ready = _courtId != null && _time != null && !_submitting;
    return Padding(
      padding: EdgeInsets.only(
        top: 18,
        bottom: MediaQuery.of(context).viewInsets.bottom + 30,
      ),
      child: Column(
        key: const Key('tournament.rescheduleSheet'),
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DateStrip(
            days: _days,
            value: _dateKey,
            onChanged: (key) => setState(() => _dateKey = key),
          ),
          const SizedBox(height: 18),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _Section(
              label: 'Cancha',
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final court in widget.courts)
                    SelectableChip(
                      key: Key('tournament.rescheduleSheet.court.${court.id}'),
                      label: court.name,
                      selected: _courtId == court.id,
                      onTap: () => setState(() => _courtId = court.id),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _Section(
              label: 'Horario',
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final time in widget.timeOptions)
                    SelectableChip(
                      key: Key(
                        'tournament.rescheduleSheet.time.${_timeLabel(time)}',
                      ),
                      label: _timeLabel(time),
                      selected: _time == time,
                      onTap: () => setState(() => _time = time),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: FilledButton.icon(
              key: const Key('tournament.rescheduleSheet.submit'),
              onPressed: ready ? _submitSV : null,
              icon: const Icon(AppIcons.check),
              label: const Text('Reprogramar'),
            ),
          ),
        ],
      ),
    );
  }
}

final class _Section extends StatelessWidget {
  const _Section({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
      ),
      const SizedBox(height: 8),
      child,
    ],
  );
}

String _timeLabel(TimeOfDay time) =>
    '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';

Future<void> showRescheduleSheet(
  BuildContext context, {
  required List<CourtDto> courts,
  required Future<void> Function({
    required String courtId,
    required DateTime scheduledAt,
  })
  onSubmit,
}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  builder: (_) => RescheduleSheet(courts: courts, onSubmit: onSubmit),
);
