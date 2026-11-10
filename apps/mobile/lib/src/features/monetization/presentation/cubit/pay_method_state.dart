import 'package:equatable/equatable.dart';

import '../../../../core/formatting/money_conversion.dart';
import '../../../../core/models/currency_code.dart';
import '../../../matches/presentation/open_match_display.dart';
import '../../data/models/match_payment_info_dto.dart';
import '../../data/models/transaction_dto.dart';
import '../../data/models/venue_payment_method_dto.dart';

enum PayMethodDestination { uploadReceipt, waiting }

/// Señal de navegación: el Cubit no tiene `BuildContext`, así que `continue_()`
/// deja acá a dónde ir y con qué datos; la vista lo consume vía
/// `BlocListener` y recién ahí llama a `context.push(...)`.
final class PayMethodNavigationIntent extends Equatable {
  const PayMethodNavigationIntent({
    required this.destination,
    required this.transactionId,
    required this.method,
    required this.amountPerPersonCents,
    this.pricingCurrency,
  });

  final PayMethodDestination destination;
  final String transactionId;
  final String method;
  final int amountPerPersonCents;
  final String? pricingCurrency;

  @override
  List<Object?> get props => [
        destination,
        transactionId,
        method,
        amountPerPersonCents,
        pricingCurrency,
      ];
}

final class PayMethodState extends Equatable {
  const PayMethodState({
    required this.amountPerPlayerCents,
    this.pricingCurrencyHint,
    this.displayCurrencyHint,
    this.loading = true,
    this.submitting = false,
    this.error,
    this.submitErrorMessage,
    this.transactionId,
    this.selectedMethodId,
    this.methods = const [],
    this.legacyPaymentInfo,
    this.resolvedPricingCurrency,
    this.resolvedDisplayCurrency,
    this.matchScheduledAt,
    this.exchangeRates = const [],
    this.fxMissingRate = false,
    this.loadedTransaction,
    this.settlementMinorCents,
    this.obligationCurrency,
    this.settlementCurrency,
    this.navigationIntent,
  });

  /// Config fija de la pantalla (no cambia tras construir el Cubit) —
  /// equivalente a los `widget.*` que leía el `State` original.
  final int amountPerPlayerCents;
  final String? pricingCurrencyHint;
  final String? displayCurrencyHint;

  final bool loading;
  final bool submitting;
  final String? error;

  /// Mensaje del SnackBar de `continue_()` (distinto del error de bootstrap).
  final String? submitErrorMessage;

  final String? transactionId;
  final String? selectedMethodId;
  final List<VenuePaymentMethodDto> methods;
  final MatchPaymentInfoDto? legacyPaymentInfo;
  final String? resolvedPricingCurrency;
  final String? resolvedDisplayCurrency;
  final DateTime? matchScheduledAt;
  final List<ExchangeRateRow> exchangeRates;
  final bool fxMissingRate;
  final TransactionDto? loadedTransaction;
  final int? settlementMinorCents;
  final CurrencyCode? obligationCurrency;
  final CurrencyCode? settlementCurrency;
  final PayMethodNavigationIntent? navigationIntent;

  CurrencyCode get displayCurrencyCode => venueDisplayCurrency(
        displayCurrency: resolvedDisplayCurrency ?? displayCurrencyHint,
        pricingCurrency: resolvedPricingCurrency ?? pricingCurrencyHint,
      );

  CurrencyCode get currentObligationCurrency => CurrencyCode.fromApiValue(
        resolvedPricingCurrency ?? pricingCurrencyHint ?? 'BS',
      );

  CurrencyCode get currentAmountCurrency => settlementMinorCents != null
      ? (settlementCurrency ?? currentObligationCurrency)
      : currentObligationCurrency;

  /// Obligación en minor: total con comisión (`amountTotal`), no solo precio p/p.
  int get obligationMinorForFx {
    final tx = loadedTransaction;
    if (tx != null) {
      final total = double.tryParse(tx.amountTotal);
      if (total != null && total > 0) {
        return (total * 100).round();
      }
    }
    return amountPerPlayerCents;
  }

  int get currentAmountMinor => settlementMinorCents ?? obligationMinorForFx;

  VenuePaymentMethodDto? get selectedMethod {
    final id = selectedMethodId;
    if (id == null) return null;
    for (final m in methods) {
      if (m.id == id) return m;
    }
    return null;
  }

  String get methodRouteValue =>
      selectedMethod?.type ?? selectedMethodId ?? 'TRANSFER';

  bool get isCash => methodRouteValue == 'CASH';

  @override
  List<Object?> get props => [
        amountPerPlayerCents,
        pricingCurrencyHint,
        displayCurrencyHint,
        loading,
        submitting,
        error,
        submitErrorMessage,
        transactionId,
        selectedMethodId,
        methods,
        legacyPaymentInfo,
        resolvedPricingCurrency,
        resolvedDisplayCurrency,
        matchScheduledAt,
        exchangeRates,
        fxMissingRate,
        loadedTransaction,
        settlementMinorCents,
        obligationCurrency,
        settlementCurrency,
        navigationIntent,
      ];
}
