import 'package:cuadrala_mobile/src/features/monetization/domain/payment_selection_ref.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('resolvePaymentSelectionRefSV', () {
    test('manda como id los medios de la sede aunque no sean UUID', () {
      // Ids reales que siembra el seed: legibles, con prefijo, y de 44 a 54
      // caracteres. Ninguno es UUID y todos superan el limite de 32 que la
      // API impone sobre paymentMethodType.
      const seedIds = <String>[
        'pm-cash-ad5d6f8b-28af-499e-89d9-1fc5478fc1bf',
        'pm-bank-banesco-ad5d6f8b-28af-499e-89d9-1fc5478fc1bf',
        'pm-bank-mercantil-ad5d6f8b-28af-499e-89d9-1fc5478fc1bf',
        'pm-pago-banesco-ad5d6f8b-28af-499e-89d9-1fc5478fc1bf',
      ];

      for (final id in seedIds) {
        final ref = resolvePaymentSelectionRefSV(id);
        expect(ref, isNotNull, reason: 'id $id deberia resolver');
        expect(ref!.venuePaymentMethodId, id, reason: 'id $id debe viajar como id');
        expect(ref.paymentMethodType, isNull, reason: 'id $id no es un tipo');
      }
    });

    test('manda como id un UUID de la sede', () {
      const id = 'b1e1c0de-0000-4000-8000-000000000001';

      final ref = resolvePaymentSelectionRefSV(id);

      expect(ref!.venuePaymentMethodId, id);
      expect(ref.paymentMethodType, isNull);
    });

    test('manda como tipo los centinelas genericos de la app', () {
      for (final type in const ['TRANSFER', 'CASH']) {
        final ref = resolvePaymentSelectionRefSV(type);
        expect(ref, isNotNull, reason: 'centinela $type deberia resolver');
        expect(ref!.paymentMethodType, type, reason: '$type es un tipo, no un id');
        expect(ref.venuePaymentMethodId, isNull, reason: '$type no es un id');
      }
    });

    test('no resuelve nada cuando no hay seleccion', () {
      expect(resolvePaymentSelectionRefSV(null), isNull);
      expect(resolvePaymentSelectionRefSV(''), isNull);
    });

    test('todo lo que viaja como tipo entra en el limite de 32 de la API', () {
      for (final type in kGenericPaymentTypes) {
        expect(type.length, lessThanOrEqualTo(32), reason: '$type excede el limite');
      }
    });
  });
}
