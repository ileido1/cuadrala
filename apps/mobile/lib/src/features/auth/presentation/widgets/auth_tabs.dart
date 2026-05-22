import 'package:flutter/material.dart';

/// A shared pill-style tab switcher used by [LoginScreen] and [RegisterScreen].
///
/// [selectedIndex] 0 = "Ingresar", 1 = "Crear cuenta".
/// Navigation is the caller's responsibility via [onTabChanged].
class AuthTabs extends StatelessWidget {
  const AuthTabs({
    super.key,
    required this.selectedIndex,
    required this.onTabChanged,
    this.isDisabled = false,
  });

  final int selectedIndex;
  final ValueChanged<int> onTabChanged;
  final bool isDisabled;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.6)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _AuthTabButton(
              label: 'Ingresar',
              selected: selectedIndex == 0,
              onTap: isDisabled ? null : () => onTabChanged(0),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _AuthTabButton(
              label: 'Crear cuenta',
              selected: selectedIndex == 1,
              onTap: isDisabled ? null : () => onTabChanged(1),
            ),
          ),
        ],
      ),
    );
  }
}

class _AuthTabButton extends StatelessWidget {
  const _AuthTabButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: selected ? scheme.surface : Colors.transparent,
          border: Border.all(
            color: selected ? scheme.outlineVariant : Colors.transparent,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w900,
              color: selected ? scheme.onSurface : scheme.onSurfaceVariant,
            ),
          ),
        ),
      ),
    );
  }
}
