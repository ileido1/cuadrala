import 'package:flutter/material.dart';

import '../../../../shared/widgets/cuadrala_mark.dart';

class AuthHeader extends StatelessWidget {
  const AuthHeader({super.key, required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: scheme.primary,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: scheme.primary.withValues(alpha: 0.22),
                    blurRadius: 18,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(6),
              child: ClipOval(
                child: Container(
                  // El círculo interno del mark es blanco fijo en el
                  // prototipo (#fff), no el `surface` del tema — en dark
                  // mode `scheme.surface` sería oscuro y el mark se perdería.
                  color: Colors.white,
                  child: const Center(child: CuadralaMark(size: 32)),
                ),
              ),
            ),
            const SizedBox(width: 12),
            const Text(
              'Cuádrala',
              style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: -0.4),
            ),
          ],
        ),
        const SizedBox(height: 22),
        Text(
          title,
          style: const TextStyle(
            fontSize: 25,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.4,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(
            subtitle!,
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontSize: 14.5,
              fontWeight: FontWeight.w500,
              height: 1.5,
            ),
          ),
        ],
      ],
    );
  }
}
