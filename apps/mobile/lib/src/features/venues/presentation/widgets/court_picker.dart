import 'package:flutter/material.dart';

import '../../../../core/theme/app_icons.dart';
import '../../../../shared/widgets/selectable_chip.dart';
import '../../../../shared/widgets/surface_tag.dart';
import '../../data/models/court_dto.dart';
import '../cubit/slot_info.dart';

/// Selector de cancha + horario (rediseño Crear partida).
///
/// Por cada cancha muestra una fila (ícono + nombre + tag superficie). La
/// cancha seleccionada despliega sus horarios disponibles como *slot chips*;
/// si no hay horarios para la fecha, muestra un estado vacío con la acción
/// "Otro día →" (que reenfoca la tira de fecha vía [onChangeDate]).
class CourtPicker extends StatelessWidget {
  const CourtPicker({
    super.key,
    required this.courts,
    required this.selectedCourtId,
    required this.selectedSlot,
    required this.slotsByCourtId,
    required this.loadingCourtId,
    required this.dateLabel,
    required this.onSelectCourt,
    required this.onSelectSlot,
    required this.onChangeDate,
    this.errorByCourtId = const {},
  });

  final List<CourtDto> courts;
  final String? selectedCourtId;
  final String? selectedSlot;

  /// courtId → franjas de horario (disponibles + ocupadas con motivo).
  final Map<String, List<SlotInfo>> slotsByCourtId;

  /// courtId → mensaje de error de carga de horarios (si aplica).
  final Map<String, String> errorByCourtId;

  /// courtId cuyos horarios se están cargando (spinner).
  final String? loadingCourtId;

  /// Etiqueta legible de la fecha, p. ej. `MAR 3`.
  final String dateLabel;

  final void Function(String courtId) onSelectCourt;
  final void Function(String iso) onSelectSlot;
  final VoidCallback onChangeDate;

  @override
  Widget build(BuildContext context) {
    if (courts.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Text(
          'No hay canchas disponibles en esta sede.',
          style: TextStyle(
            fontSize: 14,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      );
    }

    return Column(
      children: [
        for (final court in courts) ...[
          _CourtRow(
            court: court,
            selected: selectedCourtId == court.id,
            selectedSlot: selectedSlot,
            slots: slotsByCourtId[court.id],
            error: errorByCourtId[court.id],
            loading: loadingCourtId == court.id,
            dateLabel: dateLabel,
            onTap: () => onSelectCourt(court.id),
            onSelectSlot: onSelectSlot,
            onChangeDate: onChangeDate,
          ),
          const SizedBox(height: 10),
        ],
      ],
    );
  }
}

class _CourtRow extends StatelessWidget {
  const _CourtRow({
    required this.court,
    required this.selected,
    required this.selectedSlot,
    required this.slots,
    required this.error,
    required this.loading,
    required this.dateLabel,
    required this.onTap,
    required this.onSelectSlot,
    required this.onChangeDate,
  });

  final CourtDto court;
  final bool selected;
  final String? selectedSlot;
  final List<SlotInfo>? slots;
  final String? error;
  final bool loading;
  final String dateLabel;
  final VoidCallback onTap;
  final void Function(String iso) onSelectSlot;
  final VoidCallback onChangeDate;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final surfaceLabel = court.indoor ? 'Cubierta' : 'Exterior';

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: selected ? scheme.primary : scheme.outlineVariant,
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onTap,
            child: Row(
              children: [
                Icon(AppIcons.racquetSport,
                    size: 17, color: scheme.onSurfaceVariant),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    court.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: scheme.onSurface,
                    ),
                  ),
                ),
                SurfaceTag(label: surfaceLabel),
              ],
            ),
          ),
          if (selected) ...[
            const SizedBox(height: 10),
            _Slots(
              slots: slots,
              error: error,
              loading: loading,
              selectedSlot: selectedSlot,
              dateLabel: dateLabel,
              durationMinutes: court.durationMinutes,
              onSelectSlot: onSelectSlot,
              onChangeDate: onChangeDate,
            ),
          ],
        ],
      ),
    );
  }
}

class _Slots extends StatelessWidget {
  const _Slots({
    required this.slots,
    required this.error,
    required this.loading,
    required this.selectedSlot,
    required this.dateLabel,
    required this.durationMinutes,
    required this.onSelectSlot,
    required this.onChangeDate,
  });

  final List<SlotInfo>? slots;
  final String? error;
  final bool loading;
  final String? selectedSlot;
  final String dateLabel;

  /// Duración del bloque de la cancha (minutos), para mostrar el rango horario.
  final int durationMinutes;

  final void Function(String iso) onSelectSlot;
  final VoidCallback onChangeDate;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: SizedBox(
          height: 20,
          width: 20,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

    // El error tiene prioridad sobre el estado vacío.
    final errorMessage = error;
    if (errorMessage != null) {
      return _ErrorSlots(message: errorMessage);
    }

    final slotsList = slots ?? const <SlotInfo>[];
    if (slotsList.isEmpty) {
      return _EmptySlots(dateLabel: dateLabel, onChangeDate: onChangeDate);
    }

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final slot in slotsList)
          if (slot.isAvailable)
            SelectableChip(
              label: _formatSlot(slot.scheduledAt, durationMinutes),
              selected: selectedSlot == slot.scheduledAt,
              onTap: () => onSelectSlot(slot.scheduledAt),
              icon: AppIcons.clock,
            )
          else
            Tooltip(
              message: slot.reasonLabel ?? 'No disponible',
              child: SelectableChip(
                label: _formatSlot(slot.scheduledAt, durationMinutes),
                selected: false,
                disabled: true,
                icon: AppIcons.calendarBusy,
              ),
            ),
      ],
    );
  }

  /// Devuelve el rango del bloque, p. ej. `14:00 - 15:00` para una cancha de
  /// 60 min, o `14:00 - 15:30` para 90 min.
  ///
  /// Convención wall-clock-as-UTC: los componentes UTC son la hora local de la
  /// sede; se muestran tal cual (sin toLocal), igual que las tarjetas de partida.
  static String _formatSlot(String iso, int durationMinutes) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    final end = dt.add(Duration(minutes: durationMinutes));
    return '${_hhmm(dt)} - ${_hhmm(end)}';
  }

  static String _hhmm(DateTime dt) =>
      '${dt.hour.toString().padLeft(2, '0')}:'
      '${dt.minute.toString().padLeft(2, '0')}';
}


class _EmptySlots extends StatelessWidget {
  const _EmptySlots({required this.dateLabel, required this.onChangeDate});

  final String dateLabel;
  final VoidCallback onChangeDate;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(AppIcons.clock,
              size: 16, color: scheme.onSurfaceVariant),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Sin horarios el $dateLabel',
              style: TextStyle(fontSize: 13, color: scheme.onSurfaceVariant),
            ),
          ),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onChangeDate,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Otro día',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: scheme.primary,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(AppIcons.arrowForward,
                    size: 14, color: scheme.primary),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorSlots extends StatelessWidget {
  const _ErrorSlots({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: scheme.errorContainer,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(AppIcons.clock, size: 16, color: scheme.onErrorContainer),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: TextStyle(fontSize: 13, color: scheme.onErrorContainer),
            ),
          ),
        ],
      ),
    );
  }
}

