import 'package:flutter/material.dart';

import 'secondary_button.dart';

final class ErrorState extends StatelessWidget {
  const ErrorState({
    super.key,
    this.icon,
    this.title,
    required this.message,
    this.retryLabel = 'Reintentar',
    this.onRetry,
  });

  /// Ícono opcional arriba del título/mensaje (ej. `AppIcons.warning`).
  final IconData? icon;

  /// Título opcional en negrita arriba del mensaje. La mayoría de los
  /// estados de error de la app solo tienen un mensaje — omitilo en ese caso.
  final String? title;
  final String message;
  final String retryLabel;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 42, color: scheme.error),
              const SizedBox(height: 10),
            ],
            if (title != null) ...[
              Text(title!, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
            ],
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

