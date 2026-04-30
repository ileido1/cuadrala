import 'package:flutter/material.dart';

final class SkeletonList extends StatelessWidget {
  const SkeletonList({super.key, this.itemCount = 6});

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.surfaceContainerHighest;
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: itemCount,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) => Container(
        height: 72,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
}

