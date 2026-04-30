import 'package:flutter/material.dart';

import 'secondary_button.dart';

final class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.title,
    required this.message,
    this.ctaLabel,
    this.onCtaPressed,
  });

  final String title;
  final String message;
  final String? ctaLabel;
  final VoidCallback? onCtaPressed;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            if (ctaLabel != null && onCtaPressed != null) ...[
              const SizedBox(height: 16),
              SecondaryButton(label: ctaLabel!, onPressed: onCtaPressed),
            ],
          ],
        ),
      ),
    );
  }
}

