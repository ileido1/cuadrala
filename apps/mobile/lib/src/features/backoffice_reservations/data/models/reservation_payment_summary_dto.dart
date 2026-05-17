import '../../../../core/formatting/money_format.dart';
import '../../../../core/models/currency_code.dart';
import '../../../../core/models/money_amount.dart';

final class ReservationPaymentSummaryDto {
  const ReservationPaymentSummaryDto({
    required this.reservationId,
    required this.totalAmountCents,
    required this.paidAmountCents,
    required this.paymentStatus,
    required this.pricingCurrency,
    required this.pendingCount,
    required this.items,
  });

  final String reservationId;
  final int? totalAmountCents;
  final int paidAmountCents;
  final String paymentStatus;
  final CurrencyCode pricingCurrency;
  final int pendingCount;
  final List<ReservationPaymentTransactionItemDto> items;

  int get pendingAmountCents {
    final TOTAL = totalAmountCents ?? 0;
    return (TOTAL - paidAmountCents).clamp(0, TOTAL);
  }

  bool get canRegisterPayment =>
      paymentStatus != 'PAID' && pendingAmountCents > 0;

  String? findPendingTransactionId() {
    for (final ITEM in items) {
      if (ITEM.status == 'PENDING') return ITEM.id;
    }
    return null;
  }

  static ReservationPaymentSummaryDto fromJson(Map<String, Object?> json) {
    final PAID = MoneyAmount.tryFromJson(json['paidAmount']);
    final TOTAL_MINOR = parseMinorFromJson(
      (json['reservationTotalAmount'] as Map<String, Object?>?)?['amountMinor'],
    );
    final TOTAL_CENTS = json['totalAmountCents'] as int?
        ?? TOTAL_MINOR
        ?? parseMinorFromJson(json['totalAmountMinor']);

    return ReservationPaymentSummaryDto(
      reservationId: json['reservationId'] as String,
      totalAmountCents: TOTAL_CENTS,
      paidAmountCents: PAID?.amountMinor
          ?? parseMinorFromJson(json['paidAmountMinor'])
          ?? json['paidAmountCents'] as int?
          ?? 0,
      paymentStatus: json['paymentStatus'] as String? ?? 'UNPAID',
      pricingCurrency: CurrencyCode.fromApiValue(
        json['pricingCurrency'] as String? ?? PAID?.currency.apiValue,
      ),
      pendingCount: json['pendingCount'] as int? ?? 0,
      items: (json['items'] as List<dynamic>? ?? [])
          .whereType<Map<String, Object?>>()
          .map(ReservationPaymentTransactionItemDto.fromJson)
          .toList(),
    );
  }
}

final class ReservationPaymentTransactionItemDto {
  const ReservationPaymentTransactionItemDto({
    required this.id,
    required this.status,
    required this.amountTotal,
  });

  final String id;
  final String status;
  final String amountTotal;

  static ReservationPaymentTransactionItemDto fromJson(
    Map<String, Object?> json,
  ) {
    return ReservationPaymentTransactionItemDto(
      id: json['id'] as String,
      status: json['status'] as String,
      amountTotal: json['amountTotal'] as String? ?? '0',
    );
  }
}
