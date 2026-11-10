import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/data/exchange_rates_repository.dart';
import '../../../../core/di/service_locator.dart';
import '../../../../core/failures/app_failure.dart';
import '../../../../core/formatting/money_conversion.dart';
import '../../../../core/models/currency_code.dart';
import '../../../matches/data/matches_repository.dart';
import '../../../profile/data/profile_repository.dart';
import '../../../venues/data/venues_repository.dart';
import '../../data/models/match_payment_info_dto.dart';
import '../../data/models/transaction_dto.dart';
import '../../data/models/venue_payment_method_dto.dart';
import '../../data/monetization_repository.dart';
import '../../domain/payment_selection_ref.dart';
import 'pay_method_state.dart';

final class PayMethodCubit extends Cubit<PayMethodState> {
  PayMethodCubit({
    required MonetizationRepository monetizationRepository,
    required MatchesRepository matchesRepository,
    required ProfileRepository profileRepository,
    required ExchangeRatesRepository exchangeRatesRepository,
    required String matchId,
    required int amountPerPlayerCents,
    String? venueId,
    String? pricingCurrency,
    String? displayCurrency,
    DateTime? scheduledAt,
  })  : _monetizationRepository = monetizationRepository,
        _matchesRepository = matchesRepository,
        _profileRepository = profileRepository,
        _exchangeRatesRepository = exchangeRatesRepository,
        _matchId = matchId,
        _venueId = venueId,
        _initialPricingCurrency = pricingCurrency,
        _initialDisplayCurrency = displayCurrency,
        _initialScheduledAt = scheduledAt,
        super(PayMethodState(
          amountPerPlayerCents: amountPerPlayerCents,
          pricingCurrencyHint: pricingCurrency,
          displayCurrencyHint: displayCurrency,
        ));

  final MonetizationRepository _monetizationRepository;
  final MatchesRepository _matchesRepository;
  final ProfileRepository _profileRepository;
  final ExchangeRatesRepository _exchangeRatesRepository;
  final String _matchId;
  final String? _venueId;
  final String? _initialPricingCurrency;
  final String? _initialDisplayCurrency;
  final DateTime? _initialScheduledAt;

  Future<void> bootstrap() async {
    emit(PayMethodState(
      amountPerPlayerCents: state.amountPerPlayerCents,
      pricingCurrencyHint: state.pricingCurrencyHint,
      displayCurrencyHint: state.displayCurrencyHint,
      loading: true,
    ));
    try {
      final venueId = _venueId;

      var pricingCurrency = _initialPricingCurrency;
      var displayCurrency = _initialDisplayCurrency;
      var countryCode = 'VE';
      if (venueId != null && venueId.isNotEmpty) {
        try {
          final venue = await getIt<VenuesRepository>().getVenueDetail(venueId: venueId);
          pricingCurrency ??= venue.pricingCurrency ?? venue.displayCurrency;
          displayCurrency ??= venue.displayCurrency ?? venue.pricingCurrency;
          countryCode = venue.countryCode ?? 'VE';
        } catch (_) {}
      }

      DateTime? scheduledAt = _initialScheduledAt;
      try {
        final match = await _matchesRepository.getMatchById(_matchId);
        scheduledAt ??= match.scheduledAt;
      } catch (_) {}

      var exchangeRates = const <ExchangeRateRow>[];
      try {
        exchangeRates = await _exchangeRatesRepository.listByCountry(
          countryCode: countryCode,
        );
      } catch (_) {
        exchangeRates = const [];
      }

      List<VenuePaymentMethodDto> methods = const [];
      if (venueId != null && venueId.isNotEmpty) {
        try {
          methods = await _monetizationRepository.listVenuePaymentMethods(
            venueId: venueId,
          );
        } catch (_) {
          methods = const [];
        }
      }

      MatchPaymentInfoDto? legacyInfo;
      if (methods.isEmpty) {
        try {
          legacyInfo =
              await _monetizationRepository.getMatchPaymentInfo(matchId: _matchId);
        } catch (_) {
          legacyInfo = null;
        }
      }

      final me = await _profileRepository.getMe();
      final txs = await _monetizationRepository.listMyTransactions(limit: 100);
      final existing =
          txs.transactions.where((t) => t.matchId == _matchId).toList()
            ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

      TransactionDto? pendingTx;
      for (final t in existing) {
        if (t.status == 'PENDING') {
          pendingTx = t;
          break;
        }
      }

      if (pendingTx != null) {
        emit(PayMethodState(
          amountPerPlayerCents: state.amountPerPlayerCents,
          pricingCurrencyHint: state.pricingCurrencyHint,
          displayCurrencyHint: state.displayCurrencyHint,
          transactionId: pendingTx.id,
          loadedTransaction: pendingTx,
          methods: methods,
          legacyPaymentInfo: legacyInfo,
          resolvedPricingCurrency: pricingCurrency,
          resolvedDisplayCurrency: displayCurrency,
          matchScheduledAt: scheduledAt,
          exchangeRates: exchangeRates,
          selectedMethodId: methods.isNotEmpty ? methods.first.id : 'TRANSFER',
          loading: false,
        ));
        _recomputeFx();
        return;
      }

      final amount = state.amountPerPlayerCents / 100.0;
      final created = await _monetizationRepository.createMatchObligations(
        matchId: _matchId,
        amountBasePerPerson: amount,
        participantUserIds: [me.id],
      );
      final createdList = created['created'];
      if (createdList is List && createdList.isNotEmpty) {
        final first = createdList.first;
        if (first is Map<String, Object?> && first['id'] is String) {
          emit(PayMethodState(
            amountPerPlayerCents: state.amountPerPlayerCents,
            pricingCurrencyHint: state.pricingCurrencyHint,
            displayCurrencyHint: state.displayCurrencyHint,
            transactionId: first['id'] as String,
            loadedTransaction: TransactionDto(
              id: first['id'] as String,
              matchId: _matchId,
              userId: me.id,
              amountBase: (first['amountBase'] as String?) ?? '0',
              feeAmount: (first['feeAmount'] as String?) ?? '0',
              amountTotal: (first['amountTotal'] as String?) ?? '0',
              status: (first['status'] as String?) ?? 'PENDING',
              paymentMethod: 'MANUAL',
              confirmedAt: null,
              createdAt: DateTime.now(),
            ),
            methods: methods,
            legacyPaymentInfo: legacyInfo,
            resolvedPricingCurrency: pricingCurrency,
            resolvedDisplayCurrency: displayCurrency,
            matchScheduledAt: scheduledAt,
            exchangeRates: exchangeRates,
            selectedMethodId: methods.isNotEmpty ? methods.first.id : 'TRANSFER',
            loading: false,
          ));
          _recomputeFx();
          return;
        }
      }

      throw Exception('No se pudo crear la obligación.');
    } catch (e) {
      final msg = e is AppFailure ? e.message : e.toString();
      emit(PayMethodState(
        amountPerPlayerCents: state.amountPerPlayerCents,
        pricingCurrencyHint: state.pricingCurrencyHint,
        displayCurrencyHint: state.displayCurrencyHint,
        error: msg.isNotEmpty ? msg : 'No se pudo preparar el pago.',
        loading: false,
      ));
    }
  }

  void selectMethod(String methodId) {
    emit(PayMethodState(
      amountPerPlayerCents: state.amountPerPlayerCents,
      pricingCurrencyHint: state.pricingCurrencyHint,
      displayCurrencyHint: state.displayCurrencyHint,
      loading: state.loading,
      transactionId: state.transactionId,
      selectedMethodId: methodId,
      methods: state.methods,
      legacyPaymentInfo: state.legacyPaymentInfo,
      resolvedPricingCurrency: state.resolvedPricingCurrency,
      resolvedDisplayCurrency: state.resolvedDisplayCurrency,
      matchScheduledAt: state.matchScheduledAt,
      exchangeRates: state.exchangeRates,
      loadedTransaction: state.loadedTransaction,
    ));
    _recomputeFx();
  }

  void _recomputeFx() {
    final obligationMinor = state.obligationMinorForFx;
    final obligation = state.currentObligationCurrency;
    final method = state.selectedMethod;
    final settlement = CurrencyCode.fromApiValue(
      method?.settlementCurrency ?? obligation.apiValue,
    );

    if (obligation == settlement) {
      emit(_withFx(
        fxMissingRate: false,
        settlementMinorCents: obligationMinor,
        obligationCurrency: obligation,
        settlementCurrency: settlement,
      ));
      return;
    }

    final scheduled = state.matchScheduledAt ?? DateTime.now();
    final dateIso = localCalendarDateIsoSV(scheduled);
    final oblRate = pickExchangeRateForDateSV(
      state.exchangeRates,
      obligation,
      dateIso,
    );
    final setRate = pickExchangeRateForDateSV(
      state.exchangeRates,
      settlement,
      dateIso,
    );

    if (oblRate == null || setRate == null) {
      emit(_withFx(
        fxMissingRate: true,
        settlementMinorCents: null,
        obligationCurrency: obligation,
        settlementCurrency: settlement,
      ));
      return;
    }

    final settlementMinor = convertMinorBetweenCurrenciesSV(
      obligationMinor,
      obligation,
      settlement,
      oblRate.rateToBs,
      setRate.rateToBs,
    );
    emit(_withFx(
      fxMissingRate: false,
      settlementMinorCents: settlementMinor,
      obligationCurrency: obligation,
      settlementCurrency: settlement,
    ));
  }

  PayMethodState _withFx({
    required bool fxMissingRate,
    required int? settlementMinorCents,
    required CurrencyCode obligationCurrency,
    required CurrencyCode settlementCurrency,
  }) {
    return PayMethodState(
      amountPerPlayerCents: state.amountPerPlayerCents,
      pricingCurrencyHint: state.pricingCurrencyHint,
      displayCurrencyHint: state.displayCurrencyHint,
      loading: state.loading,
      transactionId: state.transactionId,
      selectedMethodId: state.selectedMethodId,
      methods: state.methods,
      legacyPaymentInfo: state.legacyPaymentInfo,
      resolvedPricingCurrency: state.resolvedPricingCurrency,
      resolvedDisplayCurrency: state.resolvedDisplayCurrency,
      matchScheduledAt: state.matchScheduledAt,
      exchangeRates: state.exchangeRates,
      fxMissingRate: fxMissingRate,
      loadedTransaction: state.loadedTransaction,
      settlementMinorCents: settlementMinorCents,
      obligationCurrency: obligationCurrency,
      settlementCurrency: settlementCurrency,
    );
  }

  Future<void> continue_() async {
    final txId = state.transactionId;
    if (txId == null || txId.isEmpty) return;

    if (!state.isCash && state.fxMissingRate) {
      emit(_withSubmitError(
        'No hay tasa de cambio para la fecha del partido. Contacta al club.',
      ));
      return;
    }

    emit(_withSubmitting(true));
    try {
      final methodId = state.selectedMethodId;
      final pricing = state.resolvedPricingCurrency ?? state.pricingCurrencyHint;
      final reportedMinor = state.isCash
          ? state.obligationMinorForFx
          : (state.settlementMinorCents ?? state.obligationMinorForFx);
      final reportedCurrency =
          (state.isCash ? state.obligationCurrency : state.settlementCurrency)
                  ?.apiValue ??
              pricing ??
              state.pricingCurrencyHint ??
              'BS';

      final selectionRef = resolvePaymentSelectionRefSV(methodId);
      if (selectionRef != null) {
        await _monetizationRepository.recordPlayerPaymentSelection(
          transactionId: txId,
          venuePaymentMethodId: selectionRef.venuePaymentMethodId,
          paymentMethodType: selectionRef.paymentMethodType,
          reportedSettlementMinor: reportedMinor,
          reportedSettlementCurrency: reportedCurrency,
        );
      }

      if (state.isCash) {
        emit(_withNavigation(PayMethodNavigationIntent(
          destination: PayMethodDestination.waiting,
          transactionId: txId,
          method: state.methodRouteValue,
          amountPerPersonCents: reportedMinor,
          pricingCurrency: reportedCurrency,
        )));
        return;
      }

      final amountForUpload = state.settlementMinorCents ?? state.amountPerPlayerCents;
      final currencyForUpload = state.settlementCurrency?.apiValue ?? pricing;

      emit(_withNavigation(PayMethodNavigationIntent(
        destination: PayMethodDestination.uploadReceipt,
        transactionId: txId,
        method: state.methodRouteValue,
        amountPerPersonCents: amountForUpload,
        pricingCurrency: currencyForUpload,
      )));
    } catch (e) {
      //? Sin este catch la excepción subía sin que nadie la mostrara: el
      //? spinner se apagaba y la pantalla quedaba igual. La API manda el
      //? detalle del campo que falló, así que se muestra su mensaje.
      final msg = e is AppFailure ? e.message : '';
      emit(_withSubmitError(
        msg.isNotEmpty ? msg : 'No se pudo registrar el medio de pago.',
      ));
    } finally {
      emit(_withSubmitting(false));
    }
  }

  PayMethodState _withSubmitting(bool submitting) {
    return PayMethodState(
      amountPerPlayerCents: state.amountPerPlayerCents,
      pricingCurrencyHint: state.pricingCurrencyHint,
      displayCurrencyHint: state.displayCurrencyHint,
      loading: state.loading,
      submitting: submitting,
      submitErrorMessage: state.submitErrorMessage,
      transactionId: state.transactionId,
      selectedMethodId: state.selectedMethodId,
      methods: state.methods,
      legacyPaymentInfo: state.legacyPaymentInfo,
      resolvedPricingCurrency: state.resolvedPricingCurrency,
      resolvedDisplayCurrency: state.resolvedDisplayCurrency,
      matchScheduledAt: state.matchScheduledAt,
      exchangeRates: state.exchangeRates,
      fxMissingRate: state.fxMissingRate,
      loadedTransaction: state.loadedTransaction,
      settlementMinorCents: state.settlementMinorCents,
      obligationCurrency: state.obligationCurrency,
      settlementCurrency: state.settlementCurrency,
      navigationIntent: state.navigationIntent,
    );
  }

  PayMethodState _withSubmitError(String message) {
    return PayMethodState(
      amountPerPlayerCents: state.amountPerPlayerCents,
      pricingCurrencyHint: state.pricingCurrencyHint,
      displayCurrencyHint: state.displayCurrencyHint,
      loading: state.loading,
      submitting: state.submitting,
      submitErrorMessage: message,
      transactionId: state.transactionId,
      selectedMethodId: state.selectedMethodId,
      methods: state.methods,
      legacyPaymentInfo: state.legacyPaymentInfo,
      resolvedPricingCurrency: state.resolvedPricingCurrency,
      resolvedDisplayCurrency: state.resolvedDisplayCurrency,
      matchScheduledAt: state.matchScheduledAt,
      exchangeRates: state.exchangeRates,
      fxMissingRate: state.fxMissingRate,
      loadedTransaction: state.loadedTransaction,
      settlementMinorCents: state.settlementMinorCents,
      obligationCurrency: state.obligationCurrency,
      settlementCurrency: state.settlementCurrency,
      navigationIntent: state.navigationIntent,
    );
  }

  PayMethodState _withNavigation(PayMethodNavigationIntent intent) {
    return PayMethodState(
      amountPerPlayerCents: state.amountPerPlayerCents,
      pricingCurrencyHint: state.pricingCurrencyHint,
      displayCurrencyHint: state.displayCurrencyHint,
      loading: state.loading,
      submitting: state.submitting,
      transactionId: state.transactionId,
      selectedMethodId: state.selectedMethodId,
      methods: state.methods,
      legacyPaymentInfo: state.legacyPaymentInfo,
      resolvedPricingCurrency: state.resolvedPricingCurrency,
      resolvedDisplayCurrency: state.resolvedDisplayCurrency,
      matchScheduledAt: state.matchScheduledAt,
      exchangeRates: state.exchangeRates,
      fxMissingRate: state.fxMissingRate,
      loadedTransaction: state.loadedTransaction,
      settlementMinorCents: state.settlementMinorCents,
      obligationCurrency: state.obligationCurrency,
      settlementCurrency: state.settlementCurrency,
      navigationIntent: intent,
    );
  }
}
