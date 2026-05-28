import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/formatting/money_format.dart';
import '../../../core/models/currency_code.dart';
import '../../catalog/data/models/category_dto.dart';
import '../data/models/court_dto.dart';
import 'cubit/venue_booking_cubit.dart';
import 'cubit/venue_booking_state.dart';

// ---------------------------------------------------------------------------
// VenueBookingScreen
//
// Full-screen booking form. VenueBookingCubit is provided at the route level
// (app_router.dart) — this widget never calls getIt.
// ---------------------------------------------------------------------------

final class VenueBookingScreen extends StatelessWidget {
  const VenueBookingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<VenueBookingCubit, VenueBookingState>(
      listener: (context, state) {
        final matchId = state.submittedMatchId;
        if (matchId != null) {
          context.go('/matches/$matchId');
          return;
        }
        final error = state.error;
        if (error != null && !state.loading && !state.submitting) {
          ScaffoldMessenger.of(context)
            ..clearSnackBars()
            ..showSnackBar(SnackBar(content: Text(error)));
        }
      },
      builder: (context, state) {
        final cubit = context.read<VenueBookingCubit>();

        if (state.loading) {
          return Scaffold(
            appBar: AppBar(title: Text(state.venue.name)),
            body: const Center(child: CircularProgressIndicator()),
          );
        }

        return Scaffold(
          appBar: AppBar(title: Text(state.venue.name)),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: state.canSubmit ? cubit.submit : null,
            label: state.submitting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Crear partido'),
            icon: state.submitting ? null : const Icon(Icons.check),
          ),
          body: CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _DatePickerRow(
                      date: state.selectedDate,
                      onPick: (picked) => cubit.selectDate(picked),
                    ),
                    const SizedBox(height: 16),
                    _CourtsAccordion(
                      courts: state.courts
                          .where((c) => c.status == 'ACTIVE')
                          .toList(),
                      selectedCourtId: state.selectedCourtId,
                      selectedSlot: state.selectedSlot,
                      slotsByCourtId: state.slotsByCourtId,
                      loadingCourtId: state.slotsLoadingCourtId,
                      onSelectCourt: cubit.selectCourt,
                      onSelectSlot: cubit.selectSlot,
                    ),
                    const SizedBox(height: 16),
                    const Divider(),
                    const SizedBox(height: 8),
                    _MatchSettingsSection(
                      state: state,
                      cubit: cubit,
                    ),
                    if (state.selectedCourt != null) ...[
                      const SizedBox(height: 8),
                      _PriceBreakdownFooter(
                        pricePerPlayerCents: state.pricePerPlayerCents,
                        pricingCurrency: state.venue.pricingCurrency,
                      ),
                    ],
                  ]),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// _DatePickerRow
// ---------------------------------------------------------------------------

class _DatePickerRow extends StatelessWidget {
  const _DatePickerRow({required this.date, required this.onPick});

  final DateTime date;
  final void Function(DateTime) onPick;

  @override
  Widget build(BuildContext context) {
    final formatted = DateFormat('dd/MM/yyyy').format(date);
    return Row(
      children: [
        const Icon(Icons.calendar_today, size: 18),
        const SizedBox(width: 8),
        Expanded(
          child: InkWell(
            onTap: () async {
              final now = DateTime.now();
              final picked = await showDatePicker(
                context: context,
                initialDate: date,
                firstDate: now,
                lastDate: now.add(const Duration(days: 60)),
              );
              if (picked != null) onPick(picked);
            },
            child: Chip(label: Text(formatted)),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// _CourtsAccordion
// ---------------------------------------------------------------------------

class _CourtsAccordion extends StatelessWidget {
  const _CourtsAccordion({
    required this.courts,
    required this.selectedCourtId,
    required this.selectedSlot,
    required this.slotsByCourtId,
    required this.loadingCourtId,
    required this.onSelectCourt,
    required this.onSelectSlot,
  });

  final List<CourtDto> courts;
  final String? selectedCourtId;
  final String? selectedSlot;
  final Map<String, List<String>> slotsByCourtId;
  final String? loadingCourtId;
  final void Function(String courtId) onSelectCourt;
  final void Function(String iso) onSelectSlot;

  @override
  Widget build(BuildContext context) {
    if (courts.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Text('No hay pistas disponibles en esta sede.'),
      );
    }

    return Column(
      children: courts
          .map((court) => _CourtTile(
                court: court,
                isSelected: selectedCourtId == court.id,
                selectedSlot: selectedSlot,
                slots: slotsByCourtId[court.id] ?? [],
                isLoadingSlots: loadingCourtId == court.id,
                onTap: () => onSelectCourt(court.id),
                onSelectSlot: onSelectSlot,
              ))
          .toList(),
    );
  }
}

class _CourtTile extends StatelessWidget {
  const _CourtTile({
    required this.court,
    required this.isSelected,
    required this.selectedSlot,
    required this.slots,
    required this.isLoadingSlots,
    required this.onTap,
    required this.onSelectSlot,
  });

  final CourtDto court;
  final bool isSelected;
  final String? selectedSlot;
  final List<String> slots;
  final bool isLoadingSlots;
  final VoidCallback onTap;
  final void Function(String iso) onSelectSlot;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ExpansionTile(
      title: Text(court.name),
      leading: const Icon(Icons.sports_tennis),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Chip(
            label: Text(court.indoor ? 'Interior' : 'Exterior'),
            labelStyle: TextStyle(fontSize: 11, color: scheme.onSurfaceVariant),
            padding: EdgeInsets.zero,
          ),
          const SizedBox(width: 4),
          const Icon(Icons.expand_more),
        ],
      ),
      onExpansionChanged: (_) => onTap(),
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (isLoadingSlots)
                const Center(child: CircularProgressIndicator())
              else if (slots.isEmpty)
                const Text('Sin horarios disponibles')
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: slots.map((iso) {
                    final time = _formatSlotTime(iso);
                    final selected = selectedSlot == iso;
                    return FilterChip(
                      label: Text(time),
                      selected: selected,
                      onSelected: (_) => onSelectSlot(iso),
                    );
                  }).toList(),
                ),
              const SizedBox(height: 8),
              _CourtInfoRow(court: court),
            ],
          ),
        ),
      ],
    );
  }

  String _formatSlotTime(String iso) {
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return iso;
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

class _CourtInfoRow extends StatelessWidget {
  const _CourtInfoRow({required this.court});

  final CourtDto court;

  @override
  Widget build(BuildContext context) {
    final currency = CurrencyCode.bs;
    final price = formatMoneyCents(court.pricePerHourCents, currency);
    return Wrap(
      spacing: 12,
      children: [
        Text('$price/hora', style: Theme.of(context).textTheme.bodySmall),
        Text('${court.durationMinutes} min', style: Theme.of(context).textTheme.bodySmall),
        Text(court.indoor ? 'Interior' : 'Exterior',
            style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// _MatchSettingsSection
// ---------------------------------------------------------------------------

class _MatchSettingsSection extends StatelessWidget {
  const _MatchSettingsSection({required this.state, required this.cubit});

  final VenueBookingState state;
  final VenueBookingCubit cubit;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Category chips
        if (state.categories.isNotEmpty) ...[
          _SectionLabel('Categoría', required: true),
          const SizedBox(height: 8),
          _CategoryChips(
            categories: state.categories,
            selectedId: state.selectedCategoryId,
            onSelect: cubit.selectCategory,
          ),
          const SizedBox(height: 16),
        ],

        // AffectsElo switch
        SwitchListTile(
          title: const Text('Afecta ELO'),
          subtitle: const Text('El resultado modifica el ranking'),
          value: state.affectsElo,
          onChanged: cubit.setAffectsElo,
          contentPadding: EdgeInsets.zero,
        ),
        const SizedBox(height: 8),

        // Gender chips
        _SectionLabel('Género'),
        const SizedBox(height: 8),
        _GenderChips(
          selected: state.gender,
          onSelect: cubit.setGender,
        ),
        const SizedBox(height: 16),

        // Max participants stepper
        _SectionLabel('Jugadores'),
        const SizedBox(height: 8),
        _ParticipantsStepper(
          value: state.maxParticipants,
          onDecrement: () => cubit.setMaxParticipants(state.maxParticipants - 1),
          onIncrement: () => cubit.setMaxParticipants(state.maxParticipants + 1),
        ),
        const SizedBox(height: 16),

        // Notes field
        TextField(
          decoration: const InputDecoration(
            labelText: 'Notas opcionales',
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
          maxLength: 300,
          onChanged: cubit.setNotes,
        ),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label, {this.required = false});

  final String label;
  final bool required;

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        text: label,
        style: Theme.of(context)
            .textTheme
            .labelLarge
            ?.copyWith(fontWeight: FontWeight.w700),
        children: [
          if (required)
            const TextSpan(
              text: ' *',
              style: TextStyle(color: Colors.red),
            ),
        ],
      ),
    );
  }
}

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({
    required this.categories,
    required this.selectedId,
    required this.onSelect,
  });

  final List<CategoryDto> categories;
  final String? selectedId;
  final void Function(String id) onSelect;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 4,
      children: categories.map((cat) {
        return FilterChip(
          label: Text(cat.name),
          selected: selectedId == cat.id,
          onSelected: (_) => onSelect(cat.id),
        );
      }).toList(),
    );
  }
}

class _GenderChips extends StatelessWidget {
  const _GenderChips({required this.selected, required this.onSelect});

  final String? selected;
  final void Function(String? gender) onSelect;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      children: [
        _GenderChip(
          label: 'Masculino',
          value: 'MALE',
          selected: selected,
          onSelect: onSelect,
        ),
        _GenderChip(
          label: 'Femenino',
          value: 'FEMALE',
          selected: selected,
          onSelect: onSelect,
        ),
        _GenderChip(
          label: 'Mixto',
          value: 'MIXED',
          selected: selected,
          onSelect: onSelect,
        ),
      ],
    );
  }
}

class _GenderChip extends StatelessWidget {
  const _GenderChip({
    required this.label,
    required this.value,
    required this.selected,
    required this.onSelect,
  });

  final String label;
  final String value;
  final String? selected;
  final void Function(String? gender) onSelect;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected == value,
      onSelected: (_) => onSelect(selected == value ? null : value),
    );
  }
}

class _ParticipantsStepper extends StatelessWidget {
  const _ParticipantsStepper({
    required this.value,
    required this.onDecrement,
    required this.onIncrement,
  });

  final int value;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          icon: const Icon(Icons.remove),
          onPressed: value > 2 ? onDecrement : null,
        ),
        Text(
          '$value',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        IconButton(
          icon: const Icon(Icons.add),
          onPressed: value < 8 ? onIncrement : null,
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// _PriceBreakdownFooter
// ---------------------------------------------------------------------------

class _PriceBreakdownFooter extends StatelessWidget {
  const _PriceBreakdownFooter({
    required this.pricePerPlayerCents,
    required this.pricingCurrency,
  });

  final int? pricePerPlayerCents;
  final String? pricingCurrency;

  @override
  Widget build(BuildContext context) {
    final currency = CurrencyCode.resolve(pricingCurrency: pricingCurrency);
    final price = pricePerPlayerCents != null
        ? formatMoneyCents(pricePerPlayerCents!, currency)
        : '—';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        'Por persona: $price',
        style: Theme.of(context).textTheme.titleSmall,
      ),
    );
  }
}
