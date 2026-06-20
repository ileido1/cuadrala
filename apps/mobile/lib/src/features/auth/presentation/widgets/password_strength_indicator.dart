import 'package:flutter/material.dart';

import '../../../../core/theme/brand_colors.dart';

enum PasswordStrength { empty, weak, fair, good, strong }

extension PasswordStrengthLabel on PasswordStrength {
  String get label => switch (this) {
        PasswordStrength.empty => '—',
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

/// Replica `strengthOf` del prototipo: +1 si ≥6 chars, +1 si ≥10,
/// +1 si mayúscula+minúscula, +1 si dígito+símbolo.
PasswordStrength evaluatePasswordStrength(String password) {
  if (password.isEmpty) return PasswordStrength.empty;
  var score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (RegExp(r'[A-Z]').hasMatch(password) && RegExp(r'[a-z]').hasMatch(password)) score++;
  if (RegExp(r'[0-9]').hasMatch(password) && RegExp(r'[^A-Za-z0-9]').hasMatch(password)) score++;
  score = score.clamp(0, 4);
  return switch (score == 0 ? 1 : score) {
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
      PasswordStrength.weak => const Color(0xFFEF4444),
      PasswordStrength.fair => BrandColors.warningAmber,
      PasswordStrength.good => BrandColors.successGreen,
      PasswordStrength.strong => scheme.primary,
    };
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final strength = evaluatePasswordStrength(password);
    final color = _colorFor(strength, scheme);

    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: List.generate(4, (index) {
              final filled = index < strength.filledSegments;
              return Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: index < 3 ? 6 : 0),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    height: 4,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(2),
                      color: filled ? color : scheme.outlineVariant,
                    ),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 7),
          Text(
            'Seguridad: ${strength.label}',
            style: TextStyle(
              color: strength == PasswordStrength.empty ? scheme.onSurfaceVariant : color,
              fontWeight: FontWeight.w800,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
