import 'package:flutter/material.dart';

enum PasswordStrength { empty, weak, fair, good, strong }

extension PasswordStrengthLabel on PasswordStrength {
  String get label => switch (this) {
        PasswordStrength.empty => '',
        PasswordStrength.weak => 'Débil',
        PasswordStrength.fair => 'Regular',
        PasswordStrength.good => 'Buena',
        PasswordStrength.strong => 'Fuerte',
      };

  /// 0..4 segmentos llenos.
  int get filledSegments => switch (this) {
        PasswordStrength.empty => 0,
        PasswordStrength.weak => 1,
        PasswordStrength.fair => 2,
        PasswordStrength.good => 3,
        PasswordStrength.strong => 4,
      };
}

PasswordStrength evaluatePasswordStrength(String password) {
  if (password.isEmpty) return PasswordStrength.empty;
  var score = 0;
  if (password.length >= 8) score++;
  if (RegExp(r'[A-Z]').hasMatch(password)) score++;
  if (RegExp(r'[0-9]').hasMatch(password)) score++;
  if (RegExp(r'[^A-Za-z0-9]').hasMatch(password)) score++;
  if (password.length >= 12 && score >= 3) score = 4;
  return switch (score) {
    0 => PasswordStrength.weak,
    1 => PasswordStrength.weak,
    2 => PasswordStrength.fair,
    3 => PasswordStrength.good,
    _ => PasswordStrength.strong,
  };
}

class PasswordStrengthIndicator extends StatelessWidget {
  const PasswordStrengthIndicator({super.key, required this.password});

  final String password;

  Color _colorFor(PasswordStrength s, ColorScheme scheme) {
    return switch (s) {
      PasswordStrength.empty => scheme.outlineVariant,
      PasswordStrength.weak => scheme.error,
      PasswordStrength.fair => const Color(0xFFFB8C00),
      PasswordStrength.good => const Color(0xFF8BC34A),
      PasswordStrength.strong => scheme.primary,
    };
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final strength = evaluatePasswordStrength(password);
    final color = _colorFor(strength, scheme);

    if (strength == PasswordStrength.empty) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: List.generate(4, (index) {
              final filled = index < strength.filledSegments;
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: index < 3 ? 4 : 0),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    height: 4,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(2),
                      color: filled ? color : scheme.outlineVariant.withValues(alpha: .5),
                    ),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 4),
          Text(
            'Seguridad: ${strength.label}',
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w800,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
