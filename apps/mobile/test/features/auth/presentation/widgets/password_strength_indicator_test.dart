import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/auth/presentation/widgets/password_strength_indicator.dart';

void main() {
  group('evaluatePasswordStrength', () {
    test('vacío => empty', () {
      expect(evaluatePasswordStrength(''), PasswordStrength.empty);
    });

    test('corta y simple => weak', () {
      expect(evaluatePasswordStrength('abc'), PasswordStrength.weak);
    });

    test('6+ solo minúsculas y números => weak', () {
      expect(evaluatePasswordStrength('abcd1234'), PasswordStrength.weak);
    });

    test('6+ con mayúsculas, minúsculas y números => fair', () {
      expect(evaluatePasswordStrength('Abcd1234'), PasswordStrength.fair);
    });

    test('12+ con mayúsculas, números y símbolos => strong', () {
      expect(evaluatePasswordStrength('Abcd1234!@#x'), PasswordStrength.strong);
    });

    test('extension expone label y filledSegments', () {
      expect(PasswordStrength.weak.label, 'Débil');
      expect(PasswordStrength.fair.filledSegments, 2);
      expect(PasswordStrength.strong.filledSegments, 4);
    });
  });
}
