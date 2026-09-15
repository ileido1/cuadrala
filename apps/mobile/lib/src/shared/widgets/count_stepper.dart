import 'package:flutter/material.dart';

import '../../core/theme/app_icons.dart';

/// Selector numérico con botones −/+ (rediseño Cuádrala).
///
/// Container `surface-2` + borde `line`; botones 38x38 con ícono 18px; valor
/// centrado `17/700`. Un botón en `min`/`max` se apaga (mismo precedente de
/// [SelectableChip]: `onSurface.withValues(alpha: 0.38)`, sin tap) en vez de
/// desaparecer, así el usuario siempre ve el rango completo del control.
class CountStepper extends StatelessWidget {
  const CountStepper({
    super.key,
    required this.value,
    required this.onChanged,
    this.min = 1,
    this.max = 8,
  });

  final int value;
  final ValueChanged<int> onChanged;
  final int min;
  final int max;

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
            icon: AppIcons.remove,
            enabled: value > min,
            onTap: () => onChanged(value - 1),
          ),
          const SizedBox(width: 2),
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
          const SizedBox(width: 2),
          _StepperButton(
            icon: AppIcons.add,
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
    final color = enabled ? scheme.onSurface : scheme.onSurface.withValues(alpha: 0.38);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: enabled ? onTap : null,
      child: SizedBox(
        width: 38,
        height: 38,
        child: DecoratedBox(
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, size: 18, color: color),
        ),
      ),
    );
  }
}
