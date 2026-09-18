import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/onboarding/presentation/validation/onboarding_input_validators.dart';

void main() {
  group('onboarding identity validators', () {
    test('accepts an optional numeric document up to the backend limit', () {
      expect(isValidOnboardingDocument(''), isTrue);
      expect(isValidOnboardingDocument('12345678901234567890'), isTrue);
    });

    test('rejects non-numeric and oversized documents', () {
      expect(isValidOnboardingDocument('123-456'), isFalse);
      expect(isValidOnboardingDocument('123456789012345678901'), isFalse);
    });

    test('matches backend maxima for name and city', () {
      expect(isValidOnboardingName('a' * 200), isTrue);
      expect(isValidOnboardingName('a' * 201), isFalse);
      expect(isValidOnboardingCity('a' * 120), isTrue);
      expect(isValidOnboardingCity('a' * 121), isFalse);
    });
  });

  group('onboarding coordinate validators', () {
    test('rejects malformed signs and decimal points', () {
      expect(isValidCoordinateSyntax('--10.5'), isFalse);
      expect(isValidCoordinateSyntax('10..5'), isFalse);
      expect(isValidCoordinateSyntax('10.5.2'), isFalse);
      expect(isValidCoordinateSyntax('10-5'), isFalse);
    });

    test('allows a leading sign while typing but rejects malformed edits', () {
      final formatter = coordinateInputFormatter();
      const oldValue = TextEditingValue(text: '');

      expect(
        formatter
            .formatEditUpdate(oldValue, const TextEditingValue(text: '-'))
            .text,
        '-',
      );
      expect(
        formatter
            .formatEditUpdate(
              const TextEditingValue(text: '10.5'),
              const TextEditingValue(text: '10..5'),
            )
            .text,
        '10.5',
      );
    });

    test('keeps coordinate range validation', () {
      expect(isValidLatitude('-90'), isTrue);
      expect(isValidLatitude('90.0001'), isFalse);
      expect(isValidLongitude('-180'), isTrue);
      expect(isValidLongitude('180.0001'), isFalse);
    });
  });
}
