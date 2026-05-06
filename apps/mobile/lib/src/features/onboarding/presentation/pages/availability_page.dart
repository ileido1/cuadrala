import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

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

  static const _slotsMeta = <AvailabilitySlot, _SlotMeta>{
    AvailabilitySlot.morning: _SlotMeta(
      title: 'Mañana',
      range: '06:00 – 12:00',
      icon: Icons.wb_sunny_outlined,
      color: Color(0xFFFFB300),
    ),
    AvailabilitySlot.afternoon: _SlotMeta(
      title: 'Tarde',
      range: '12:00 – 18:00',
      icon: Icons.wb_twilight,
      color: Color(0xFFFB8C00),
    ),
    AvailabilitySlot.evening: _SlotMeta(
      title: 'Noche',
      range: '18:00 – 22:00',
      icon: Icons.nightlight_outlined,
      color: Color(0xFF5C6BC0),
    ),
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
    return order.where(_slots.contains).map((s) => _slotsMeta[s]!.title.toLowerCase()).join('/');
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
                              _DayChip(
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
                        for (final entry in _slotsMeta.entries) ...[
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
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: saving ? null : _submit,
                    icon: saving
                        ? const SizedBox(
                            height: 16,
                            width: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.bolt, size: 20),
                    label: const Text('¡Empezar a jugar!'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _SlotMeta {
  const _SlotMeta({
    required this.title,
    required this.range,
    required this.icon,
    required this.color,
  });

  final String title;
  final String range;
  final IconData icon;
  final Color color;
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

class _DayChip extends StatelessWidget {
  const _DayChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          color: selected ? scheme.primary : scheme.surfaceContainerHighest,
          border: Border.all(
            color: selected ? scheme.primary : scheme.outlineVariant,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w800,
            color: selected ? scheme.onPrimary : scheme.onSurface,
          ),
        ),
      ),
    );
  }
}

class _SlotCard extends StatelessWidget {
  const _SlotCard({required this.meta, required this.selected, required this.onTap});

  final _SlotMeta meta;
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
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: selected ? scheme.primary.withValues(alpha: .08) : scheme.surface,
          border: Border.all(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: meta.color.withValues(alpha: .15),
              ),
              child: Icon(meta.icon, color: meta.color, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    meta.title,
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    meta.range,
                    style: TextStyle(color: scheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected ? scheme.primary : Colors.transparent,
                border: Border.all(
                  color: selected ? scheme.primary : scheme.outline,
                  width: 1.5,
                ),
              ),
              child: selected
                  ? Icon(Icons.check, size: 16, color: scheme.onPrimary)
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
