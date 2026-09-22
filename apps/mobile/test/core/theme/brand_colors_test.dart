import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/theme/brand_colors.dart';

void main() {
  test('should expose the supplied canonical palette', () {
    expect(BrandColors.padelGreen.toARGB32(), 0xFF1F9A4D);
    expect(BrandColors.navy.toARGB32(), 0xFF12203A);
  });
}
