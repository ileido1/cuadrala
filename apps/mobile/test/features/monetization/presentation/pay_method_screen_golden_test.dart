import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/models/match_payment_info_dto.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/models/transaction_dto.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/monetization/presentation/pay_method_screen.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

import '../../../helpers/golden_harness.dart';

class _MockMonetizationRepository extends Mock
    implements MonetizationRepository {}

class _MockMatchesRepository extends Mock implements MatchesRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockExchangeRatesRepository extends Mock
    implements ExchangeRatesRepository {}

const _matchId = 'match-1';
const _userId = 'user-1';

final _fixedDate = DateTime.utc(2030, 6, 1, 20);

final _match = MatchDetailDto(
  id: _matchId,
  sportId: 'sport',
  categoryId: 'cat',
  type: 'REGULAR',
  status: 'SCHEDULED',
  scheduledAt: _fixedDate,
  pricePerPlayerCents: 5000,
  maxParticipants: 4,
  participantCount: 1,
  openSpots: 3,
  courtId: null,
  clubName: 'Club Cuádrala',
  courtName: 'Cancha 1',
  locationLabel: 'Las Mercedes, Caracas',
  tournamentId: null,
  participants: const [],
  createdAt: _fixedDate,
  updatedAt: _fixedDate,
);

//? Issue #116: pay_method_screen.dart ya tenía tests de comportamiento pero
//? ningún golden. Cubre la selección de método sin sede (Transferencia
//? preseleccionada) con una obligación PENDING ya existente.
void main() {
  late _MockMonetizationRepository monetizationRepository;
  late _MockMatchesRepository matchesRepository;
  late _MockProfileRepository profileRepository;
  late _MockExchangeRatesRepository exchangeRatesRepository;

  setUpAll(loadGoldenFonts);

  setUp(() async {
    await getIt.reset();
    monetizationRepository = _MockMonetizationRepository();
    matchesRepository = _MockMatchesRepository();
    profileRepository = _MockProfileRepository();
    exchangeRatesRepository = _MockExchangeRatesRepository();

    getIt.registerSingleton<MonetizationRepository>(monetizationRepository);
    getIt.registerSingleton<MatchesRepository>(matchesRepository);
    getIt.registerSingleton<ProfileRepository>(profileRepository);
    getIt.registerSingleton<ExchangeRatesRepository>(exchangeRatesRepository);

    when(() => matchesRepository.getMatchById(_matchId))
        .thenAnswer((_) async => _match);
    //? Sin tasas: la pantalla consulta la tasa con DateTime.now(), así que
    //? se deja vacía para que el golden no dependa del reloj.
    when(() => exchangeRatesRepository.listByCountry(
          countryCode: any(named: 'countryCode'),
        )).thenAnswer((_) async => const []);
    when(() => monetizationRepository.getMatchPaymentInfo(matchId: _matchId))
        .thenAnswer((_) async => const MatchPaymentInfoDto());
    when(() => profileRepository.getMe()).thenAnswer(
      (_) async => const UserMeDto(
        id: _userId,
        email: 'u@test.local',
        name: 'User',
        subscriptionType: 'FREE',
      ),
    );
    when(() =>
            monetizationRepository.listMyTransactions(limit: any(named: 'limit')))
        .thenAnswer(
      (_) async => UserTransactionsResult(
        userId: _userId,
        transactions: [
          TransactionDto(
            id: 'tx-existing',
            matchId: _matchId,
            userId: _userId,
            amountBase: '50',
            feeAmount: '0',
            amountTotal: '50',
            status: 'PENDING',
            paymentMethod: 'MANUAL',
            confirmedAt: null,
            createdAt: _fixedDate,
          ),
        ],
      ),
    );
  });

  tearDown(() async {
    await getIt.reset();
  });

  for (final brightness in Brightness.values) {
    testWidgets('Método de pago — Transferencia ${brightness.name}',
        (tester) async {
      await pumpGolden(
        tester,
        brightness: brightness,
        child: const PayMethodScreen(
          matchId: _matchId,
          amountPerPlayerCents: 5000,
          matchTitle: 'Club Cuádrala',
          pricingCurrency: 'USD',
        ),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/pay_method_screen_transfer_${brightness.name}.png',
        ),
      );
    });
  }
}
