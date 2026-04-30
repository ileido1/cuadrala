import 'package:flutter/material.dart';

import 'secondary_button.dart';

final class ErrorState extends StatelessWidget {
  const ErrorState({
    super.key,
    required this.title,
    required this.message,
    this.retryLabel = 'Reintentar',
    this.onRetry,
  });

  final String title;
  final String message;
  final String retryLabel;
  final VoidCallback? onRetry;

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
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              SecondaryButton(label: retryLabel, onPressed: onRetry),
            ],
          ],
        ),
      ),
    );
  }
}

