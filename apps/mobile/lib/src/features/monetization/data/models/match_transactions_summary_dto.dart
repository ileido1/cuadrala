import '../../../../core/models/money_amount.dart';

final class MatchTransactionsSummaryDto {
  const MatchTransactionsSummaryDto({
    required this.matchId,
    required this.transactionCount,
    required this.totalAmountBase,
    required this.totalFeeAmount,
    required this.totalAmount,
    required this.pendingCount,
    required this.confirmedCount,
    required this.cancelledCount,
    this.pricingCurrency,
    this.totalAmountMoney,
    this.totalAmountBaseMoney,
    this.totalFeeAmountMoney,
  });

  final String matchId;
  final int transactionCount;
  final String totalAmountBase;
  final String totalFeeAmount;
  final String totalAmount;
  final int pendingCount;
  final int confirmedCount;
  final int cancelledCount;
  final String? pricingCurrency;
  final MoneyAmount? totalAmountMoney;
  final MoneyAmount? totalAmountBaseMoney;
  final MoneyAmount? totalFeeAmountMoney;

  static MatchTransactionsSummaryDto fromJson(Map<String, Object?> json) {
    return MatchTransactionsSummaryDto(
      matchId: json['matchId'] as String,
      transactionCount: (json['transactionCount'] as num).toInt(),
      totalAmountBase: json['totalAmountBase'] as String,
      totalFeeAmount: json['totalFeeAmount'] as String,
      totalAmount: json['totalAmount'] as String,
      pendingCount: (json['pendingCount'] as num).toInt(),
      confirmedCount: (json['confirmedCount'] as num).toInt(),
      cancelledCount: (json['cancelledCount'] as num).toInt(),
      pricingCurrency: json['pricingCurrency'] as String?,
      totalAmountMoney: MoneyAmount.tryFromJson(json['totalAmountMoney']),
      totalAmountBaseMoney: MoneyAmount.tryFromJson(json['totalAmountBaseMoney']),
      totalFeeAmountMoney: MoneyAmount.tryFromJson(json['totalFeeAmountMoney']),
    );
  }
}
