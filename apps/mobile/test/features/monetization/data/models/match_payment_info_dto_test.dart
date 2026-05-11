import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/monetization/data/models/match_payment_info_dto.dart';

void main() {
  group('MatchPaymentInfoDto', () {
    test('fromJson parses flat response correctly', () {
      final json = {
        'paymentHolder': 'Juan Pérez',
        'paymentBank': 'Banco Galicia',
        'paymentCvu': '1234567890123456789012',
        'paymentAlias': 'juan.perez.alias',
        'paymentNotes': 'Solo transferencias seguras',
      };

      final dto = MatchPaymentInfoDto.fromJson(json);

      expect(dto.paymentHolder, 'Juan Pérez');
      expect(dto.paymentBank, 'Banco Galicia');
      expect(dto.paymentCvu, '1234567890123456789012');
      expect(dto.paymentAlias, 'juan.perez.alias');
      expect(dto.paymentNotes, 'Solo transferencias seguras');
    });

    test('fromJson handles null fields', () {
      final json = <String, Object?>{};

      final dto = MatchPaymentInfoDto.fromJson(json);

      expect(dto.paymentHolder, isNull);
      expect(dto.paymentBank, isNull);
      expect(dto.paymentCvu, isNull);
      expect(dto.paymentAlias, isNull);
      expect(dto.paymentNotes, isNull);
    });

    test('fromJson handles partial fields', () {
      final json = {
        'paymentHolder': 'Ana Gómez',
        'paymentBank': null,
        'paymentCvu': '0001112223334445556667',
        'paymentAlias': null,
        'paymentNotes': 'Notas especiales',
      };

      final dto = MatchPaymentInfoDto.fromJson(json);

      expect(dto.paymentHolder, 'Ana Gómez');
      expect(dto.paymentBank, isNull);
      expect(dto.paymentCvu, '0001112223334445556667');
      expect(dto.paymentAlias, isNull);
      expect(dto.paymentNotes, 'Notas especiales');
    });
  });
}
