// Tests de caracterización (issue #109): este screen todavía no tenía NINGÚN
// test antes de extraer su lógica a un Cubit. Fijan el comportamiento actual
// para que la extracción no lo cambie.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/models/match_payment_info_dto.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/models/transaction_dto.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/monetization/presentation/pay_method_screen.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:cuadrala_mobile/src/features/venues/data/venues_repository.dart';

class _MockMonetizationRepository extends Mock implements MonetizationRepository {}

class _MockMatchesRepository extends Mock implements MatchesRepository {}

class _MockVenuesRepository extends Mock implements VenuesRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockExchangeRatesRepository extends Mock implements ExchangeRatesRepository {}

const _matchId = 'match-1';
const _userId = 'user-1';

MatchDetailDto _buildMatch() {
  final now = DateTime.utc(2026, 5, 5, 12);
  return MatchDetailDto(
    id: _matchId,
    sportId: 'sport',
    categoryId: 'cat',
    type: 'REGULAR',
    status: 'SCHEDULED',
    scheduledAt: now,
    pricePerPlayerCents: 5000,
    maxParticipants: 4,
    participantCount: 1,
    openSpots: 3,
    courtId: null,
    clubName: 'Club',
    courtName: 'Cancha 1',
    locationLabel: 'Dirección',
    tournamentId: null,
    participants: const [],
    createdAt: now,
    updatedAt: now,
  );
}

Widget _buildTestApp() {
  final router = GoRouter(
    initialLocation: PayMethodScreen.route(
      matchId: _matchId,
      amountPerPersonCents: 5000,
      matchTitle: 'Club Palermo',
      pricingCurrency: 'USD',
    ),
    routes: [
      GoRoute(
        path: '/matches/:matchId/pay/method',
        builder: (context, state) => const PayMethodScreen(
          matchId: _matchId,
          amountPerPlayerCents: 5000,
          matchTitle: 'Club Palermo',
          pricingCurrency: 'USD',
        ),
      ),
      GoRoute(
        path: '/matches/:matchId/pay/upload-receipt',
        builder: (context, state) => const Scaffold(
          body: Text('upload-receipt route'),
        ),
      ),
      GoRoute(
        path: '/matches/:matchId/pay/waiting',
        builder: (context, state) => const Scaffold(
          body: Text('waiting route'),
        ),
      ),
    ],
  );
  return MaterialApp.router(routerConfig: router);
}

void main() {
  late _MockMonetizationRepository monetizationRepository;
  late _MockMatchesRepository matchesRepository;
  late _MockVenuesRepository venuesRepository;
  late _MockProfileRepository profileRepository;
  late _MockExchangeRatesRepository exchangeRatesRepository;

  setUp(() async {
    await getIt.reset();

    monetizationRepository = _MockMonetizationRepository();
    matchesRepository = _MockMatchesRepository();
    venuesRepository = _MockVenuesRepository();
    profileRepository = _MockProfileRepository();
    exchangeRatesRepository = _MockExchangeRatesRepository();

    getIt.registerSingleton<MonetizationRepository>(monetizationRepository);
    getIt.registerSingleton<MatchesRepository>(matchesRepository);
    getIt.registerSingleton<VenuesRepository>(venuesRepository);
    getIt.registerSingleton<ProfileRepository>(profileRepository);
    getIt.registerSingleton<ExchangeRatesRepository>(exchangeRatesRepository);

    when(() => matchesRepository.getMatchById(_matchId))
        .thenAnswer((_) async => _buildMatch());
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
    when(() => monetizationRepository.listMyTransactions(limit: any(named: 'limit')))
        .thenAnswer((_) async => const UserTransactionsResult(
              userId: _userId,
              transactions: [],
            ));
    when(() => monetizationRepository.createMatchObligations(
          matchId: any(named: 'matchId'),
          amountBasePerPerson: any(named: 'amountBasePerPerson'),
          participantUserIds: any(named: 'participantUserIds'),
        )).thenAnswer((_) async => {
          'created': [
            {
              'id': 'tx-new',
              'amountBase': '50',
              'feeAmount': '0',
              'amountTotal': '50',
              'status': 'PENDING',
            },
          ],
        });
    when(() => monetizationRepository.recordPlayerPaymentSelection(
          transactionId: any(named: 'transactionId'),
          venuePaymentMethodId: any(named: 'venuePaymentMethodId'),
          paymentMethodType: any(named: 'paymentMethodType'),
          reportedSettlementMinor: any(named: 'reportedSettlementMinor'),
          reportedSettlementCurrency: any(named: 'reportedSettlementCurrency'),
        )).thenAnswer((_) async {});
  });

  tearDown(() async {
    await getIt.reset();
  });

  testWidgets(
    'sin venueId: ofrece Transferencia/Efectivo y Transferencia queda '
    'preseleccionada',
    (tester) async {
      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      expect(find.text('Transferencia bancaria'), findsOneWidget);
      expect(find.text('Efectivo'), findsOneWidget);
      expect(find.text('Ya pagué · Enviar comprobante'), findsOneWidget);
    },
  );

  testWidgets(
    'continuar con Transferencia (default) navega a subir comprobante',
    (tester) async {
      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Ya pagué · Enviar comprobante'));
      await tester.pumpAndSettle();

      expect(find.text('upload-receipt route'), findsOneWidget);
      verify(() => monetizationRepository.recordPlayerPaymentSelection(
            transactionId: 'tx-new',
            venuePaymentMethodId: any(named: 'venuePaymentMethodId'),
            paymentMethodType: any(named: 'paymentMethodType'),
            reportedSettlementMinor: any(named: 'reportedSettlementMinor'),
            reportedSettlementCurrency: any(named: 'reportedSettlementCurrency'),
          )).called(1);
    },
  );

  testWidgets(
    'seleccionar Efectivo y continuar navega directo a esperar confirmación '
    '(sin subir comprobante)',
    (tester) async {
      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Efectivo'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirmar inscripción'));
      await tester.pumpAndSettle();

      expect(find.text('waiting route'), findsOneWidget);
      expect(find.text('upload-receipt route'), findsNothing);
    },
  );

  testWidgets(
    'reutiliza una transacción PENDING existente en vez de crear una nueva '
    'obligación',
    (tester) async {
      when(() => monetizationRepository.listMyTransactions(limit: any(named: 'limit')))
          .thenAnswer((_) async => UserTransactionsResult(
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
                    createdAt: DateTime.utc(2026, 5, 5),
                  ),
                ],
              ));

      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      verifyNever(() => monetizationRepository.createMatchObligations(
            matchId: any(named: 'matchId'),
            amountBasePerPerson: any(named: 'amountBasePerPerson'),
            participantUserIds: any(named: 'participantUserIds'),
          ));

      await tester.tap(find.text('Ya pagué · Enviar comprobante'));
      await tester.pumpAndSettle();

      verify(() => monetizationRepository.recordPlayerPaymentSelection(
            transactionId: 'tx-existing',
            venuePaymentMethodId: any(named: 'venuePaymentMethodId'),
            paymentMethodType: any(named: 'paymentMethodType'),
            reportedSettlementMinor: any(named: 'reportedSettlementMinor'),
            reportedSettlementCurrency: any(named: 'reportedSettlementCurrency'),
          )).called(1);
    },
  );

  testWidgets(
    'bootstrap fallido muestra el error y "Reintentar" vuelve a intentarlo',
    (tester) async {
      var callCount = 0;
      when(() => monetizationRepository.createMatchObligations(
            matchId: any(named: 'matchId'),
            amountBasePerPerson: any(named: 'amountBasePerPerson'),
            participantUserIds: any(named: 'participantUserIds'),
          )).thenAnswer((_) async {
        callCount++;
        if (callCount == 1) {
          throw const AppFailure(
            code: 'OBLIGATION_FAILED',
            message: 'No se pudo preparar el cobro.',
          );
        }
        return {
          'created': [
            {
              'id': 'tx-new',
              'amountBase': '50',
              'feeAmount': '0',
              'amountTotal': '50',
              'status': 'PENDING',
            },
          ],
        };
      });

      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      expect(find.text('No se pudo preparar el cobro.'), findsOneWidget);

      await tester.tap(find.text('Reintentar'));
      await tester.pumpAndSettle();

      expect(find.text('Transferencia bancaria'), findsOneWidget);
    },
  );
}
