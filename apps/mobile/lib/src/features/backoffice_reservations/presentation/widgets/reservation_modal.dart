import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/models/reservation_dto.dart';
import '../cubit/backoffice_reservations_cubit.dart';

final class ReservationModal extends StatefulWidget {
  const ReservationModal({
    super.key,
    required this.venueId,
    this.initialCourtId,
    this.initialDate,
    this.initialStartTime,
  }) : reservation = null;

  const ReservationModal.fromReservation({
    super.key,
    required this.venueId,
    required this.reservation,
  })  : initialCourtId = null,
        initialDate = null,
        initialStartTime = null;

  final String venueId;
  final ReservationDto? reservation;
  final String? initialCourtId;
  final DateTime? initialDate;
  final String? initialStartTime;

  @override
  State<ReservationModal> createState() => _ReservationModalState();
}

final class _ReservationModalState extends State<ReservationModal> {
  late String? _courtId;
  late DateTime _date;
  late String _startTime;
  late String _endTime;
  late ReservationType _type;
  late TextEditingController _notesController;

  bool get _isEditing => widget.reservation != null;
  bool get _isTournament => _type == ReservationType.tournament;

  @override
  void initState() {
    super.initState();
    if (_isEditing) {
      final res = widget.reservation!;
      _courtId = res.courtId;
      _date = DateTime.parse(res.date);
      _startTime = res.startTime;
      _endTime = res.endTime;
      _type = res.type;
      _notesController = TextEditingController(text: res.notes ?? '');
    } else {
      _courtId = widget.initialCourtId;
      _date = widget.initialDate ?? DateTime.now();
      _startTime = widget.initialStartTime ?? '10:00';
      _endTime = _calculateEndTime(_startTime);
      _type = ReservationType.reservation;
      _notesController = TextEditingController();
    }
  }

  String _calculateEndTime(String start) {
    final parts = start.split(':');
    var hour = int.parse(parts[0]);
    final minute = int.parse(parts[1]);
    hour = (hour + 1) % 24;
    return '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<BackofficeReservationsCubit>().state;
    final saving = state.saving;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                _isEditing ? 'Reservación' : 'Nueva Reserva',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 20),

              // Court selection
              if (!_isEditing) ...[
                Text(
                  'Cancha',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                // Simplified court selector
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    border: Border.all(color: Theme.of(context).colorScheme.outline),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: DropdownButton<String>(
                    value: _courtId,
                    isExpanded: true,
                    underline: const SizedBox(),
                    hint: const Text('Seleccionar cancha'),
                    items: const [
                      DropdownMenuItem(value: 'court-1', child: Text('Cancha 1')),
                      DropdownMenuItem(value: 'court-2', child: Text('Cancha 2')),
                    ],
                    onChanged: (v) => setState(() => _courtId = v),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Date
              Text(
                'Fecha',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              InkWell(
                onTap: () => _selectDate(context),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                  decoration: BoxDecoration(
                    border: Border.all(color: Theme.of(context).colorScheme.outline),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today, size: 20),
                      const SizedBox(width: 12),
                      Text(
                        '${_date.day}/${_date.month}/${_date.year}',
                        style: const TextStyle(fontSize: 16),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Time
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Desde',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        InkWell(
                          onTap: () => _selectTime(context, true),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                            decoration: BoxDecoration(
                              border: Border.all(color: Theme.of(context).colorScheme.outline),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(_startTime, style: const TextStyle(fontSize: 16)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Hasta',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        InkWell(
                          onTap: () => _selectTime(context, false),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                            decoration: BoxDecoration(
                              border: Border.all(color: Theme.of(context).colorScheme.outline),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(_endTime, style: const TextStyle(fontSize: 16)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Type
              if (!_isEditing) ...[
                Text(
                  'Tipo',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                SegmentedButton<ReservationType>(
                  segments: const [
                    ButtonSegment(
                      value: ReservationType.reservation,
                      label: Text('Reserva'),
                      icon: Icon(Icons.event),
                    ),
                    ButtonSegment(
                      value: ReservationType.blocked,
                      label: Text('Bloqueado'),
                      icon: Icon(Icons.block),
                    ),
                  ],
                  selected: {_type},
                  onSelectionChanged: (s) => setState(() => _type = s.first),
                ),
                const SizedBox(height: 16),
              ],

              // Notes
              Text(
                'Notas',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _notesController,
                decoration: InputDecoration(
                  hintText: 'Agregar notas (opcional)',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 20),

              // Actions
              if (_isEditing && !_isTournament) ...[
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: saving ? null : _cancelReservation,
                    icon: saving
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.cancel),
                    label: const Text('Cancelar Reservación'),
                    style: FilledButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ),
              ] else if (!_isEditing) ...[
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: saving || _courtId == null ? null : _submit,
                    icon: saving
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.check),
                    label: Text(_type == ReservationType.blocked ? 'Bloquear' : 'Crear Reserva'),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _selectDate(BuildContext context) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _date = picked);
    }
  }

  Future<void> _selectTime(BuildContext context, bool isStart) async {
    final parts = (isStart ? _startTime : _endTime).split(':');
    final initial = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
    final picked = await showTimePicker(context: context, initialTime: initial);
    if (picked != null) {
      setState(() {
        final timeStr = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
        if (isStart) {
          _startTime = timeStr;
          _endTime = _calculateEndTime(_startTime);
        } else {
          _endTime = timeStr;
        }
      });
    }
  }

  void _submit() {
    final cubit = context.read<BackofficeReservationsCubit>();
    if (_type == ReservationType.blocked) {
      cubit.blockSlot(
        courtId: _courtId!,
        date: _date,
        startTime: _startTime,
        endTime: _endTime,
      );
    } else {
      cubit.createReservation(
        courtId: _courtId!,
        date: _date,
        startTime: _startTime,
        endTime: _endTime,
        type: _type,
        notes: _notesController.text.isNotEmpty ? _notesController.text : null,
      );
    }
    Navigator.of(context).pop();
  }

  void _cancelReservation() {
    final cubit = context.read<BackofficeReservationsCubit>();
    cubit.cancelReservation(reservationId: widget.reservation!.id);
    Navigator.of(context).pop();
  }
}