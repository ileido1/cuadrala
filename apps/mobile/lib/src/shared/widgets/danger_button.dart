import 'package:flutter/material.dart';

final class DangerButton extends StatelessWidget {
  const DangerButton({
    super.key,
    required this.label,
    required this.onPressed,
  });

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 48,
      child: FilledButton.tonal(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          foregroundColor: Theme.of(context).colorScheme.onErrorContainer,
          backgroundColor: Theme.of(context).colorScheme.errorContainer,
        ),
        child: Text(label),
      ),
    );
  }
}

