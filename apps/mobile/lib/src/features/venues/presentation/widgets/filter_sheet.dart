import 'package:flutter/material.dart';

/// Bottom sheet de filtros para VenuesScreen.
/// Widget puro: sin Cubit ni getIt. Los callbacks propagan cambios al cubit.
final class VenueFilterSheet extends StatelessWidget {
  const VenueFilterSheet({
    super.key,
    required this.availableSports,
    required this.selectedSport,
    required this.indoorOnly,
    required this.onSportSelected,
    required this.onIndoorChanged,
  });

  final List<String> availableSports;
  final String? selectedSport;
  final bool indoorOnly;

  /// Se llama con el deporte seleccionado, o null para limpiar el filtro.
  final ValueChanged<String?> onSportSelected;
  final ValueChanged<bool> onIndoorChanged;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text('Filtrar sedes', style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            Text('Deporte', style: textTheme.labelLarge),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                FilterChip(
                  label: const Text('Todos'),
                  selected: selectedSport == null,
                  onSelected: (_) => onSportSelected(null),
                ),
                ...availableSports.map(
                  (sport) => FilterChip(
                    label: Text(sport),
                    selected: selectedSport == sport,
                    onSelected: (_) => onSportSelected(sport),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: Text('Solo canchas techadas', style: textTheme.labelLarge)),
                Switch(
                  value: indoorOnly,
                  onChanged: onIndoorChanged,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
