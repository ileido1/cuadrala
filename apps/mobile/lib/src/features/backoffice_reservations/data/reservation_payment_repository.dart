import '../../../core/failures/app_failure.dart';
import 'backoffice_reservations_api.dart';
import 'models/reservation_payment_summary_dto.dart';
import 'models/venue_payment_method_dto.dart';

final class ReservationPaymentRepository {
  ReservationPaymentRepository({required BackofficeReservationsApi api})
      : _api = api;

  final BackofficeReservationsApi _api;

  Future<ReservationPaymentSummaryDto> getPaymentSummary({
    required String reservationId,
  }) async {
    final data = await _api.getReservationPaymentSummaryEnvelope(
      reservationId: reservationId,
    );
    return ReservationPaymentSummaryDto.fromJson(data);
  }

  Future<List<VenuePaymentMethodDto>> listPaymentMethods({
    required String venueId,
  }) async {
    final data = await _api.listVenuePaymentMethodsEnvelope(venueId: venueId);
    return parseVenuePaymentMethods(data);
  }

  Future<String> resolveOrCreatePendingTransactionId({
    required String reservationId,
    required double amountBaseMajor,
    required String payerUserId,
  }) async {
    final SUMMARY = await getPaymentSummary(reservationId: reservationId);
    final EXISTING = SUMMARY.findPendingTransactionId();
    if (EXISTING != null) return EXISTING;

    final CREATED = await _api.createReservationObligationsEnvelope(
      reservationId: reservationId,
      body: {
        'amountBasePerPerson': amountBaseMajor,
        'participantUserIds': [payerUserId],
      },
    );

    final CREATED_ROWS = CREATED['created'] as List<dynamic>?;
    if (CREATED_ROWS != null && CREATED_ROWS.isNotEmpty) {
      final FIRST = CREATED_ROWS.first;
      if (FIRST is Map<String, Object?> && FIRST['id'] is String) {
        return FIRST['id'] as String;
      }
    }

    final AGAIN = await getPaymentSummary(reservationId: reservationId);
    final PENDING = AGAIN.findPendingTransactionId();
    if (PENDING != null) return PENDING;

    throw const AppFailure(
      code: 'SIN_OBLIGACION_PENDIENTE',
      message:
          'No hay una obligación pendiente para este monto. Revisa el resumen de pagos.',
    );
  }

  Future<void> confirmManualPayment({
    required String transactionId,
    required String venuePaymentMethodId,
    required int settlementAmountMinor,
    required String settlementCurrencyCode,
    String? referenceNumber,
  }) async {
    await _api.confirmTransactionManualEnvelope(
      transactionId: transactionId,
      body: {
        'venuePaymentMethodId': venuePaymentMethodId,
        'settlementAmount': {
          'amountMinor': settlementAmountMinor.toString(),
          'currencyCode': settlementCurrencyCode,
        },
        if (referenceNumber != null && referenceNumber.isNotEmpty)
          'referenceNumber': referenceNumber,
      },
    );
  }
}
