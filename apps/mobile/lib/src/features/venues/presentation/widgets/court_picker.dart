import 'package:flutter/material.dart';

import '../../../../core/theme/brand_colors.dart';
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
                Icon(Icons.sports_tennis_rounded,
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
                _SurfaceTag(label: surfaceLabel),
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
          _SlotChip(
            label: _formatSlot(iso),
            selected: selectedSlot == iso,
            onTap: () => onSelectSlot(iso),
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

class _SlotChip extends StatelessWidget {
  const _SlotChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fg = selected ? BrandColors.onHero : scheme.onSurface;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        height: 34,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: selected ? scheme.primary : scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: 1.5,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.schedule_rounded,
              size: 13,
              color: fg.withValues(alpha: selected ? 1 : 0.5),
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: fg,
              ),
            ),
          ],
        ),
      ),
    );
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
          Icon(Icons.schedule_rounded,
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
                Icon(Icons.arrow_forward_rounded,
                    size: 14, color: scheme.primary),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SurfaceTag extends StatelessWidget {
  const _SurfaceTag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(7),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: scheme.onSurfaceVariant,
        ),
      ),
    );
  }
}
