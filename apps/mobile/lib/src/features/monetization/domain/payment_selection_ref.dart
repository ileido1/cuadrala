/// Tipos de pago genéricos que la app ofrece cuando la sede no tiene medios
/// configurados. Es un conjunto cerrado: el backend los mapea por nombre
/// (`TRANSFER`, `CASH`, …), nunca los trata como identificadores.
const Set<String> kGenericPaymentTypes = {'TRANSFER', 'CASH'};

/// Cómo identificar ante la API el medio de pago que eligió el jugador.
///
/// La API distingue dos cosas que en la UI se eligen igual:
/// - `venuePaymentMethodId`: un medio configurado por la sede, referenciado
///   por su id (hasta 64 caracteres, y no necesariamente un UUID).
/// - `paymentMethodType`: un tipo genérico (hasta 32 caracteres).
///
/// Solo uno de los dos viaja en el body.
final class PaymentSelectionRef {
  const PaymentSelectionRef.venueMethod(String id)
      : venuePaymentMethodId = id,
        paymentMethodType = null;

  const PaymentSelectionRef.genericType(String type)
      : venuePaymentMethodId = null,
        paymentMethodType = type;

  final String? venuePaymentMethodId;
  final String? paymentMethodType;
}

/// Decide si la selección viaja como id de medio de la sede o como tipo genérico.
///
/// La decisión es por procedencia, no por forma: los tipos genéricos son un
/// conjunto conocido y cerrado, y todo lo demás es un id emitido por la sede.
/// Inferirlo de la forma del id (p. ej. exigiendo que parezca un UUID) rompe
/// con los ids legibles del seed —`pm-pago-banesco-…`— que además superan el
/// límite de 32 caracteres de `paymentMethodType`.
///
/// Devuelve `null` cuando no hay nada seleccionado.
PaymentSelectionRef? resolvePaymentSelectionRefSV(String? selectedMethodId) {
  if (selectedMethodId == null || selectedMethodId.isEmpty) {
    return null;
  }
  if (kGenericPaymentTypes.contains(selectedMethodId)) {
    return PaymentSelectionRef.genericType(selectedMethodId);
  }
  return PaymentSelectionRef.venueMethod(selectedMethodId);
}
