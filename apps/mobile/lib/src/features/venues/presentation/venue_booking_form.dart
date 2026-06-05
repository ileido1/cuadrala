import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/formatting/fx_price_labels.dart';
import '../../../core/formatting/money_conversion.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/models/currency_code.dart';
import '../../../shared/widgets/date_strip.dart';
import '../../../shared/widgets/dual_price.dart';
import '../../../shared/widgets/segmented_control.dart';
import '../../../shared/widgets/selectable_chip.dart';
import '../../catalog/data/models/category_dto.dart';
import 'cubit/venue_booking_cubit.dart';
import 'cubit/venue_booking_state.dart';
import 'widgets/court_picker.dart';

/// Formulario de reserva autocontenible (rediseño Crear partida).
///
/// [VenueBookingCubit] debe estar provisto por encima de este widget.
/// [onMatchCreated] se dispara con el ID del partido al crearlo con éxito.
final class VenueBookingForm extends StatefulWidget {
  const VenueBookingForm({super.key, required this.onMatchCreated});

  final void Function(String matchId) onMatchCreated;

  @override
  State<VenueBookingForm> createState() => _VenueBookingFormState();
}

class _VenueBookingFormState extends State<VenueBookingForm> {
  /// Días disponibles para la tira de fecha (3 semanas desde hoy).
  late final List<DateStripDay> _days = buildDateStripDays(21);
  final _scrollController = ScrollController();
  List<ExchangeRateRow> _exchangeRates = const [];

  @override
  void initState() {
    super.initState();
    _loadExchangeRates();
  }

  Future<void> _loadExchangeRates() async {
    final venue = context.read<VenueBookingCubit>().state.venue;
    final rates = await loadExchangeRatesSafelySV(
      countryCode: venue.countryCode ?? 'VE',
    );
    if (mounted) setState(() => _exchangeRates = rates);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  String _keyFor(DateTime date) {
    final normalized = DateTime(date.year, date.month, date.day);
    for (final d in _days) {
      if (d.date == normalized) return d.key;
    }
    return _days.first.key;
  }

  DateStripDay _dayFor(DateTime date) {
    final normalized = DateTime(date.year, date.month, date.day);
    return _days.firstWhere(
      (d) => d.date == normalized,
      orElse: () => _days.first,
    );
  }

  void _scrollToTop() {
    if (!_scrollController.hasClients) return;
    _scrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<VenueBookingCubit, VenueBookingState>(
      listener: (context, state) {
        final matchId = state.submittedMatchId;
        if (matchId != null) {
          widget.onMatchCreated(matchId);
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
          return const Center(child: CircularProgressIndicator());
        }

        final selectedDay = _dayFor(state.selectedDate);
        final dateLabel = '${selectedDay.dowLabel} ${selectedDay.date.day}';
        final activeCourts =
            state.courts.where((c) => c.status == 'ACTIVE').toList();

        return Column(
          children: [
            Expanded(
              child: ListView(
                controller: _scrollController,
                padding: const EdgeInsets.fromLTRB(0, 8, 0, 16),
                children: [
                  // ── Cuándo ───────────────────────────────────────────────
                  const _SectionLabel('Cuándo'),
                  const SizedBox(height: 10),
                  DateStrip(
                    days: _days,
                    value: _keyFor(state.selectedDate),
                    onChanged: (key) {
                      final day =
                          _days.firstWhere((d) => d.key == key, orElse: () => _days.first);
                      cubit.selectDate(day.date);
                    },
                  ),
                  const SizedBox(height: 24),

                  // ── Cancha y horario ─────────────────────────────────────
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 20),
                    child: _SectionLabel('Cancha y horario', required: true),
                  ),
                  const SizedBox(height: 10),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: CourtPicker(
                      courts: activeCourts,
                      selectedCourtId: state.selectedCourtId,
                      selectedSlot: state.selectedSlot,
                      slotsByCourtId: state.slotsByCourtId,
                      loadingCourtId: state.slotsLoadingCourtId,
                      dateLabel: dateLabel,
                      onSelectCourt: cubit.selectCourt,
                      onSelectSlot: cubit.selectSlot,
                      onChangeDate: _scrollToTop,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // ── Ajustes de la partida ────────────────────────────────
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: MatchSettingsSection(state: state, cubit: cubit),
                  ),
                ],
              ),
            ),
            VenueBookingStickyFooter(
              state: state,
              dateLabel: dateLabel,
              onSubmit: cubit.submit,
              exchangeRates: _exchangeRates,
              selectedDate: state.selectedDate,
            ),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Section label
// ---------------------------------------------------------------------------

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label, {this.required = false});

  final String label;
  final bool required;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Text.rich(
      TextSpan(
        text: label.toUpperCase(),
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
          color: scheme.onSurfaceVariant,
        ),
        children: [
          if (required)
            TextSpan(
              text: '  •',
              style: TextStyle(color: scheme.primary),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Match settings
// ---------------------------------------------------------------------------

class MatchSettingsSection extends StatelessWidget {
  const MatchSettingsSection({super.key, required this.state, required this.cubit});

  final VenueBookingState state;
  final VenueBookingCubit cubit;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (state.categories.isNotEmpty) ...[
          const _SectionLabel('Categoría', required: true),
          const SizedBox(height: 10),
          _CategoryChips(
            categories: state.categories,
            selectedId: state.selectedCategoryId,
            onSelect: cubit.selectCategory,
          ),
          const SizedBox(height: 20),
        ],

        // Afecta ELO
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: scheme.outlineVariant, width: 1.5),
          ),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(Icons.adjust_rounded,
                    size: 20, color: scheme.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Afecta ELO',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: scheme.onSurface,
                      ),
                    ),
                    Text(
                      'El resultado modifica el ranking',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Switch(
                value: state.affectsElo,
                onChanged: cubit.setAffectsElo,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Género
        const _SectionLabel('Género'),
        const SizedBox(height: 10),
        SegmentedControl<String>(
          value: state.gender ?? 'MALE',
          onChanged: (g) => cubit.setGender(g),
          options: const [
            SegmentedOption(value: 'MALE', label: 'Masculino'),
            SegmentedOption(value: 'FEMALE', label: 'Femenino'),
            SegmentedOption(value: 'MIXED', label: 'Mixto'),
          ],
        ),
        const SizedBox(height: 20),

        // Jugadores
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Jugadores',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: scheme.onSurface,
                    ),
                  ),
                  Text(
                    'Cupos totales en la partida',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            _Stepper(
              value: state.maxParticipants,
              min: 2,
              max: 8,
              onChanged: cubit.setMaxParticipants,
            ),
          ],
        ),
        const SizedBox(height: 20),

        // Notas
        const _SectionLabel('Notas (opcional)'),
        const SizedBox(height: 10),
        TextField(
          minLines: 3,
          maxLines: 5,
          maxLength: 300,
          onChanged: cubit.setNotes,
          decoration: const InputDecoration(
            hintText: 'Nivel esperado, si llevas pelotas, parking…',
          ),
        ),
      ],
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
      runSpacing: 8,
      children: [
        for (final cat in categories)
          SelectableChip(
            label: cat.name,
            selected: selectedId == cat.id,
            onTap: () => onSelect(cat.id),
          ),
      ],
    );
  }
}

class _Stepper extends StatelessWidget {
  const _Stepper({
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
  });

  final int value;
  final int min;
  final int max;
  final void Function(int value) onChanged;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _StepperButton(
            icon: Icons.remove_rounded,
            enabled: value > min,
            onTap: () => onChanged(value - 1),
          ),
          SizedBox(
            width: 32,
            child: Text(
              '$value',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: scheme.onSurface,
              ),
            ),
          ),
          _StepperButton(
            icon: Icons.add_rounded,
            enabled: value < max,
            onTap: () => onChanged(value + 1),
          ),
        ],
      ),
    );
  }
}

class _StepperButton extends StatelessWidget {
  const _StepperButton({
    required this.icon,
    required this.enabled,
    required this.onTap,
  });

  final IconData icon;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: enabled ? onTap : null,
      child: SizedBox(
        width: 38,
        height: 38,
        child: Icon(
          icon,
          size: 18,
          color: enabled
              ? scheme.onSurface
              : scheme.onSurfaceVariant.withValues(alpha: 0.45),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Sticky footer (summary + CTA)
// ---------------------------------------------------------------------------

class VenueBookingStickyFooter extends StatelessWidget {
  const VenueBookingStickyFooter({
    super.key,
    required this.state,
    required this.dateLabel,
    required this.onSubmit,
    this.exchangeRates = const [],
    required this.selectedDate,
  });

  final VenueBookingState state;
  final String dateLabel;
  final VoidCallback onSubmit;
  final List<ExchangeRateRow> exchangeRates;
  final DateTime selectedDate;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final court = state.selectedCourt;
    final hasSlot = court != null && state.selectedSlot != null;
    final ready = state.canSubmit;
    final currency = CurrencyCode.resolve(
      pricingCurrency: state.venue.pricingCurrency,
    );
    final dateIso = localCalendarDateIsoSV(selectedDate);

    return Container(
      padding: EdgeInsets.fromLTRB(
        20,
        14,
        20,
        MediaQuery.of(context).padding.bottom + 16,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            scheme.surface.withValues(alpha: 0),
            scheme.surface,
          ],
        ),
        border: Border(
          top: BorderSide(color: scheme.outlineVariant),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (hasSlot) ...[
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${state.venue.name} · ${court.name} · '
                    '${_slotTime(state.selectedSlot!)}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                if (state.pricePerPlayerCents != null)
                  DualPrice(
                    primaryLabel: formatMoneyFromMinor(
                      state.pricePerPlayerCents!,
                      currency,
                    ),
                    secondaryLabel: secondaryBsLabelSV(
                      primaryMinor: state.pricePerPlayerCents!,
                      primaryCurrency: currency,
                      rates: exchangeRates,
                      effectiveDateIso: dateIso,
                    ),
                    suffix: 'p/p',
                  ),
              ],
            ),
            const SizedBox(height: 12),
          ],
          SizedBox(
            width: double.infinity,
            height: 54,
            child: FilledButton.icon(
              onPressed: ready ? onSubmit : null,
              icon: state.submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.check_rounded),
              label: Text(ready ? 'Crear partida' : 'Elige cancha y horario'),
            ),
          ),
        ],
      ),
    );
  }

  static String _slotTime(String iso) {
    final dt = DateTime.tryParse(iso)?.toLocal();
    if (dt == null) return iso;
    return '${dt.hour.toString().padLeft(2, '0')}:'
        '${dt.minute.toString().padLeft(2, '0')}';
  }
}
