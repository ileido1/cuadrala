import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/theme/app_icons.dart';
import '../../../../shared/constants/availability_slot_styles.dart';
import '../../../../shared/widgets/primary_button.dart';
import '../../../../shared/widgets/selectable_chip.dart';
import '../../data/models/onboarding_status_dto.dart';
import '../../data/models/user_availability_dto.dart';
import '../cubit/onboarding_cubit.dart';
import '../cubit/onboarding_state.dart';

class OnboardingAvailabilityPage extends StatefulWidget {
  const OnboardingAvailabilityPage({super.key, required this.onContinue});

  final VoidCallback onContinue;

  @override
  State<OnboardingAvailabilityPage> createState() => _OnboardingAvailabilityPageState();
}

class _OnboardingAvailabilityPageState extends State<OnboardingAvailabilityPage> {
  final Set<DayOfWeek> _days = {};
  final Set<AvailabilitySlot> _slots = {};

  static const _daysOrder = <DayOfWeek>[
    DayOfWeek.monday,
    DayOfWeek.tuesday,
    DayOfWeek.wednesday,
    DayOfWeek.thursday,
    DayOfWeek.friday,
    DayOfWeek.saturday,
    DayOfWeek.sunday,
  ];

  static const _daysShort = <DayOfWeek, String>{
    DayOfWeek.monday: 'Lun',
    DayOfWeek.tuesday: 'Mar',
    DayOfWeek.wednesday: 'Mié',
    DayOfWeek.thursday: 'Jue',
    DayOfWeek.friday: 'Vie',
    DayOfWeek.saturday: 'Sáb',
    DayOfWeek.sunday: 'Dom',
  };

  static const _daysLong = <DayOfWeek, String>{
    DayOfWeek.monday: 'Lunes',
    DayOfWeek.tuesday: 'Martes',
    DayOfWeek.wednesday: 'Miércoles',
    DayOfWeek.thursday: 'Jueves',
    DayOfWeek.friday: 'Viernes',
    DayOfWeek.saturday: 'Sábado',
    DayOfWeek.sunday: 'Domingo',
  };

  String _selectedDaysSummary() {
    if (_days.isEmpty) return '';
    final names = _daysOrder.where(_days.contains).map((d) => _daysLong[d]!).toList();
    if (names.length == 1) return names.first;
    if (names.length == 2) return names.join(' y ');
    return '${names.sublist(0, names.length - 1).join(', ')} y ${names.last}';
  }

  String _slotsSummary() {
    if (_slots.isEmpty) return '';
    final order = [AvailabilitySlot.morning, AvailabilitySlot.afternoon, AvailabilitySlot.evening];
    return order
        .where(_slots.contains)
        .map((s) => availabilitySlotStyles[s]!.title.toLowerCase())
        .join('/');
  }

  Future<void> _submit() async {
    if (_days.isEmpty || _slots.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona al menos un día y una franja.')),
      );
      return;
    }
    final items = <UserAvailabilityDto>[
      for (final d in _daysOrder.where(_days.contains))
        for (final s in _slots) UserAvailabilityDto(dayOfWeek: d, slot: s),
    ];
    final ok = await context.read<OnboardingCubit>().saveAvailability(items);
    if (!mounted) return;
    if (ok) widget.onContinue();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OnboardingCubit, OnboardingState>(
      builder: (context, state) {
        final saving = state.savingStep == OnboardingStep.availability;
        final scheme = Theme.of(context).colorScheme;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('¿Cuándo juegas?', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 6),
                Text(
                  'Te mostramos partidas que se ajusten a tu tiempo.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 20),
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _SectionTitle(title: 'Días disponibles'),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final d in _daysOrder)
                              SelectableChip(
                                label: _daysShort[d]!,
                                selected: _days.contains(d),
                                onTap: () => setState(() {
                                  if (_days.contains(d)) {
                                    _days.remove(d);
                                  } else {
                                    _days.add(d);
                                  }
                                }),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        if (_days.isNotEmpty)
                          Text(
                            '${_days.length} día${_days.length == 1 ? "" : "s"} seleccionado${_days.length == 1 ? "" : "s"}: ${_selectedDaysSummary()}',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: scheme.onSurfaceVariant,
                                ),
                          ),
                        const SizedBox(height: 24),
                        const _SectionTitle(title: 'Horario preferido'),
                        const SizedBox(height: 10),
                        for (final entry in availabilitySlotStyles.entries) ...[
                          _SlotCard(
                            meta: entry.value,
                            selected: _slots.contains(entry.key),
                            onTap: () => setState(() {
                              if (_slots.contains(entry.key)) {
                                _slots.remove(entry.key);
                              } else {
                                _slots.add(entry.key);
                              }
                            }),
                          ),
                          const SizedBox(height: 10),
                        ],
                      ],
                    ),
                  ),
                ),
                if (state.errorMessage != null && !saving) ...[
                  const SizedBox(height: 8),
                  Text(state.errorMessage!,
                      style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ],
                if (_days.isNotEmpty && _slots.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8, top: 4),
                    child: Text(
                      'Recibirás partidas los ${_selectedDaysSummary()} en horario de ${_slotsSummary()}.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                            fontStyle: FontStyle.italic,
                          ),
                    ),
                  ),
                PrimaryButton(
                  label: '¡Empezar a jugar!',
                  icon: AppIcons.bolt,
                  height: 54,
                  isLoading: saving,
                  onPressed: _submit,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w900,
          ),
    );
  }
}

class _SlotCard extends StatelessWidget {
  const _SlotCard({required this.meta, required this.selected, required this.onTap});

  final AvailabilitySlotStyle meta;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: selected ? scheme.primary.withValues(alpha: .15) : scheme.surface,
          border: Border.all(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: meta.color,
              ),
              child: Icon(meta.icon, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    meta.title,
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    meta.range,
                    style: TextStyle(fontSize: 13, color: scheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 26,
              height: 26,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected ? scheme.primary : Colors.transparent,
                border: Border.all(
                  color: selected ? scheme.primary : scheme.outline,
                  width: 1.5,
                ),
              ),
              child: selected
                  ? Icon(AppIcons.check, size: 16, color: scheme.onPrimary)
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
