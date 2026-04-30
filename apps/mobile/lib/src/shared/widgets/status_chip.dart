import 'package:flutter/material.dart';

final class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.label, this.color});

  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final chipColor = color ?? Theme.of(context).colorScheme.secondaryContainer;
    return Chip(
      label: Text(label),
      backgroundColor: chipColor,
      side: BorderSide(color: Theme.of(context).colorScheme.outlineVariant),
    );
  }
}

