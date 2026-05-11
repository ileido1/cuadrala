import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'package:cuadrala_mobile/src/shared/widgets/app_header.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/user_availability_dto.dart';
import 'package:cuadrala_mobile/src/features/availability/data/availability_repository.dart';
import 'package:cuadrala_mobile/src/features/availability/presentation/cubit/availability_cubit.dart';
import 'package:cuadrala_mobile/src/features/availability/presentation/cubit/availability_state.dart';

final class AvailabilityScreen extends StatefulWidget {
  const AvailabilityScreen({super.key, required this.repository});

  /// Repository sourced from service_locator. Registered in PR 2 (routing + DI).
  // ignore: unused_field
  final AvailabilityRepository repository;

  @override
  State<AvailabilityScreen> createState() => _AvailabilityScreenState();
}

final class _AvailabilityScreenState extends State<AvailabilityScreen> {
  late final AvailabilityCubit _cubit;

  @override
  void initState() {
    super.initState();
    _cubit = AvailabilityCubit(repository: widget.repository);
    _cubit.load();
  }

  @override
  void dispose() {
    _cubit.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _cubit,
      child: const _AvailabilityView(),
    );
  }
}

final class _AvailabilityView extends StatelessWidget {
  const _AvailabilityView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('availability.screen'),
      body: SafeArea(
        child: Column(
          children: [
            const AppHeader(title: 'Mis horarios'),
            Expanded(child: _Body(state: context.watch<AvailabilityCubit>().state)),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('availability.add.button'),
        onPressed: () => _showAddBottomSheet(context),
        icon: const Icon(Icons.add),
        label: const Text('Agregar'),
      ),
    );
  }

  void _showAddBottomSheet(BuildContext context) {
    final cubit = context.read<AvailabilityCubit>();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => BlocProvider.value(
        value: cubit,
        child: const _AddSlotBottomSheet(),
      ),
    );
  }
}

final class _Body extends StatelessWidget {
  const _Body({required this.state});

  final AvailabilityState state;

  @override
  Widget build(BuildContext context) {
    if (state.status == AvailabilityStatus.initial || state.status == AvailabilityStatus.loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.status == AvailabilityStatus.failure) {
      return _ErrorView(
        message: state.error ?? 'No se pudieron cargar tus horarios.',
        onRetry: () => context.read<AvailabilityCubit>().load(),
      );
    }
    if (state.slots.isEmpty) {
      return const _EmptyView();
    }
    return RefreshIndicator(
      onRefresh: () => context.read<AvailabilityCubit>().load(),
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 80),
        itemCount: state.slots.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          final slot = state.slots[index];
          return _SlotCard(
            slot: slot,
            saving: state.saving,
            onRemove: () => context.read<AvailabilityCubit>().removeSlot(slot.dayOfWeek, slot.slot),
          );
        },
      ),
    );
  }
}

final class _SlotCard extends StatelessWidget {
  const _SlotCard({required this.slot, required this.saving, required this.onRemove});

  final UserAvailabilityDto slot;
  final bool saving;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Dismissible(
      key: Key('slot-${slot.dayOfWeek.name}-${slot.slot.name}'),
      direction: saving ? DismissDirection.none : DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: scheme.error,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Icon(Icons.delete_outline, color: scheme.onError),
      ),
      onDismissed: (_) => onRemove(),
      confirmDismiss: (_) async {
        return await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('¿Eliminar horario?'),
            content: Text('${_dayLabel(slot.dayOfWeek)} en ${_slotLabel(slot.slot)} se eliminará.'),
            actions: [
              TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancelar')),
              FilledButton(
                onPressed: () => Navigator.of(ctx).pop(true),
                style: FilledButton.styleFrom(backgroundColor: scheme.error),
                child: const Text('Eliminar'),
              ),
            ],
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: scheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: scheme.outlineVariant),
        ),
        child: Row(
          children: [
            _DayBadge(day: slot.dayOfWeek),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_dayLabel(slot.dayOfWeek), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                  const SizedBox(height: 2),
                  Text(_slotLabel(slot.slot), style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 13)),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
          ],
        ),
      ),
    );
  }

  String _dayLabel(DayOfWeek d) => switch (d) {
        DayOfWeek.monday => 'Lunes',
        DayOfWeek.tuesday => 'Martes',
        DayOfWeek.wednesday => 'Miércoles',
        DayOfWeek.thursday => 'Jueves',
        DayOfWeek.friday => 'Viernes',
        DayOfWeek.saturday => 'Sábado',
        DayOfWeek.sunday => 'Domingo',
      };

  String _slotLabel(AvailabilitySlot s) => switch (s) {
        AvailabilitySlot.morning => 'Mañana (06:00 – 12:00)',
        AvailabilitySlot.afternoon => 'Tarde (12:00 – 18:00)',
        AvailabilitySlot.evening => 'Noche (18:00 – 22:00)',
      };
}

final class _DayBadge extends StatelessWidget {
  const _DayBadge({required this.day});

  final DayOfWeek day;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final (icon, color) = _metaFor(day, scheme);
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
      child: Icon(icon, color: color, size: 22),
    );
  }

  (IconData, Color) _metaFor(DayOfWeek day, ColorScheme scheme) {
    return switch (day) {
      DayOfWeek.monday => (Icons.work_outline, Colors.indigo),
      DayOfWeek.tuesday => (Icons.local_fire_department_outlined, Colors.orange),
      DayOfWeek.wednesday => (Icons.sports_esports_outlined, Colors.cyan),
      DayOfWeek.thursday => (Icons.thunderstorm_outlined, Colors.purple),
      DayOfWeek.friday => (Icons.star_outline, Colors.amber),
      DayOfWeek.saturday => (Icons.celebration_outlined, Colors.pink),
      DayOfWeek.sunday => (Icons.restaurant_outlined, Colors.teal),
    };
  }
}

final class _EmptyView extends StatelessWidget {
  const _EmptyView();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.schedule_outlined, size: 52, color: scheme.onSurfaceVariant),
            const SizedBox(height: 16),
            const Text('Sin horarios configurados', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
            const SizedBox(height: 8),
            Text(
              'Agregá los días y horarios en los que podés jugar para recibir invitaciones a partidas.',
              textAlign: TextAlign.center,
              style: TextStyle(color: scheme.onSurfaceVariant, height: 1.3),
            ),
          ],
        ),
      ),
    );
  }
}

final class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 52, color: scheme.error),
            const SizedBox(height: 16),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Reintentar')),
          ],
        ),
      ),
    );
  }
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────

final class _AddSlotBottomSheet extends StatefulWidget {
  const _AddSlotBottomSheet();

  @override
  State<_AddSlotBottomSheet> createState() => _AddSlotBottomSheetState();
}

final class _AddSlotBottomSheetState extends State<_AddSlotBottomSheet> {
  final Set<DayOfWeek> _days = {};
  final Set<AvailabilitySlot> _slots = {};
  String? _duplicateWarning;

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

  static const _slotsMeta = <AvailabilitySlot, _SlotMeta>{
    AvailabilitySlot.morning: _SlotMeta(title: 'Mañana', range: '06:00 – 12:00', icon: Icons.wb_sunny_outlined, color: Color(0xFFFFB300)),
    AvailabilitySlot.afternoon: _SlotMeta(title: 'Tarde', range: '12:00 – 18:00', icon: Icons.wb_twilight, color: Color(0xFFFB8C00)),
    AvailabilitySlot.evening: _SlotMeta(title: 'Noche', range: '18:00 – 22:00', icon: Icons.nightlight_outlined, color: Color(0xFF5C6BC0)),
  };

  void _checkDuplicate() {
    if (_days.isEmpty || _slots.isEmpty) {
      setState(() => _duplicateWarning = null);
      return;
    }
    final cubit = context.read<AvailabilityCubit>();
    for (final d in _days) {
      for (final s in _slots) {
        if (cubit.containsSlot(d, s)) {
          setState(() => _duplicateWarning = 'Este horario ya está configurado');
          return;
        }
      }
    }
    setState(() => _duplicateWarning = null);
  }

  Future<void> _submit() async {
    if (_days.isEmpty || _slots.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Seleccioná al menos un día y una franja.')),
      );
      return;
    }
    final cubit = context.read<AvailabilityCubit>();
    for (final d in _daysOrder.where(_days.contains)) {
      for (final s in _slots) {
        await cubit.addSlot(d, s);
      }
    }
    if (!mounted) return;
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final saving = context.watch<AvailabilityCubit>().state.saving;
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
                    color: scheme.onSurfaceVariant.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text('Agregar horario', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
              const SizedBox(height: 20),
              Text('Días', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final d in _daysOrder)
                    _DayChip(
                      label: _daysShort[d]!,
                      selected: _days.contains(d),
                      onTap: () {
                        setState(() {
                          if (_days.contains(d)) {
                            _days.remove(d);
                          } else {
                            _days.add(d);
                          }
                        });
                        _checkDuplicate();
                      },
                    ),
                ],
              ),
              const SizedBox(height: 20),
              Text('Franja horaria', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 10),
              for (final entry in _slotsMeta.entries) ...[
                _SlotCardBS(
                  meta: entry.value,
                  selected: _slots.contains(entry.key),
                  onTap: () {
                    setState(() {
                      if (_slots.contains(entry.key)) {
                        _slots.remove(entry.key);
                      } else {
                        _slots.add(entry.key);
                      }
                    });
                    _checkDuplicate();
                  },
                ),
                const SizedBox(height: 8),
              ],
              if (_duplicateWarning != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: scheme.error.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: scheme.error.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.warning_outlined, color: scheme.error, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _duplicateWarning!,
                          style: TextStyle(color: scheme.error, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              if (_days.isNotEmpty && _slots.isNotEmpty && _duplicateWarning == null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: scheme.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Se agregarán ${_days.length} día${_days.length == 1 ? "" : "s"} × ${_slots.length} franja${_slots.length == 1 ? "" : "s"}.',
                    style: TextStyle(color: scheme.primary, fontWeight: FontWeight.w700, fontSize: 13),
                  ),
                ),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: saving ? null : _submit,
                  icon: saving
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.check, size: 20),
                  label: Text(saving ? 'Guardando…' : 'Guardar'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final class _SlotMeta {
  const _SlotMeta({required this.title, required this.range, required this.icon, required this.color});
  final String title;
  final String range;
  final IconData icon;
  final Color color;
}

final class _DayChip extends StatelessWidget {
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
          border: Border.all(color: selected ? scheme.primary : scheme.outlineVariant),
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

final class _SlotCardBS extends StatelessWidget {
  const _SlotCardBS({required this.meta, required this.selected, required this.onTap});

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
          color: selected ? scheme.primary.withValues(alpha: 0.08) : scheme.surface,
          border: Border.all(color: selected ? scheme.primary : scheme.outlineVariant, width: selected ? 1.5 : 1),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(shape: BoxShape.circle, color: meta.color.withValues(alpha: 0.15)),
              child: Icon(meta.icon, color: meta.color, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(meta.title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                  const SizedBox(height: 2),
                  Text(meta.range, style: TextStyle(color: scheme.onSurfaceVariant)),
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
                border: Border.all(color: selected ? scheme.primary : scheme.outline, width: 1.5),
              ),
              child: selected ? Icon(Icons.check, size: 16, color: scheme.onPrimary) : null,
            ),
          ],
        ),
      ),
    );
  }
}
