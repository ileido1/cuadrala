import 'package:flutter/material.dart';

import '../../../../core/theme/app_icons.dart';
import '../../../../shared/widgets/selectable_chip.dart';
import '../../../../shared/widgets/surface_tag.dart';
import '../../data/models/court_dto.dart';

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
  });

  final List<CourtDto> courts;
  final String? selectedCourtId;
  final String? selectedSlot;

  /// courtId → lista de ISO `scheduledAt` disponibles.
  final Map<String, List<String>> slotsByCourtId;

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
    required this.loading,
    required this.dateLabel,
    required this.onTap,
    required this.onSelectSlot,
    required this.onChangeDate,
  });

  final CourtDto court;
  final bool selected;
  final String? selectedSlot;
  final List<String>? slots;
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
              loading: loading,
              selectedSlot: selectedSlot,
              dateLabel: dateLabel,
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
    required this.loading,
    required this.selectedSlot,
    required this.dateLabel,
    required this.onSelectSlot,
    required this.onChangeDate,
  });

  final List<String>? slots;
  final bool loading;
  final String? selectedSlot;
  final String dateLabel;
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

    final available = slots ?? const <String>[];
    if (available.isEmpty) {
      return _EmptySlots(dateLabel: dateLabel, onChangeDate: onChangeDate);
    }

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final iso in available)
          SelectableChip(
            label: _formatSlot(iso),
            selected: selectedSlot == iso,
            onTap: () => onSelectSlot(iso),
            icon: AppIcons.clock,
          ),
      ],
    );
  }

  static String _formatSlot(String iso) {
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return iso;
    return '${dt.hour.toString().padLeft(2, '0')}:'
        '${dt.minute.toString().padLeft(2, '0')}';
  }
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

