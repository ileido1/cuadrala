import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/models/transaction_dto.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/models/venue_payment_method_dto.dart';
import 'package:cuadrala_mobile/src/features/monetization/presentation/pay_method_screen.dart';
import 'package:cuadrala_mobile/src/features/monetization/presentation/waiting_confirmation_screen.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

final class _MockProfileRepository extends Mock implements ProfileRepository {}

final class _MockMonetizationRepository extends Mock implements MonetizationRepository {}

void main() {
  group('Pay flow (widgets)', () {
    late _MockMonetizationRepository monetizationRepo;

    setUp(() async {
      await getIt.reset();
      final profileRepo = _MockProfileRepository();
      when(() => profileRepo.getMe()).thenAnswer(
        (_) async => const UserMeDto(
          id: 'u1',
          email: 'u@test.local',
          name: 'User',
          subscriptionType: 'FREE',
        ),
      );
      getIt.registerSingleton<ProfileRepository>(profileRepo);

      monetizationRepo = _MockMonetizationRepository();
      when(() => monetizationRepo.listMyTransactions(limit: any(named: 'limit'))).thenAnswer(
        (_) async => UserTransactionsResult(
          userId: 'u1',
          transactions: [
            TransactionDto(
              id: 'tx1',
              matchId: 'm1',
              userId: 'u1',
              amountBase: '50',
              feeAmount: '5',
              amountTotal: '55',
              status: 'PENDING',
              paymentMethod: 'MANUAL',
              confirmedAt: null,
              createdAt: DateTime.utc(2026, 5, 5),
            ),
          ],
        ),
      );
      when(() => monetizationRepo.listVenuePaymentMethods(venueId: any(named: 'venueId')))
          .thenAnswer(
        (_) async => const [
          VenuePaymentMethodDto(
            id: 'vpm-1',
            venueId: 'venue-1',
            type: 'BANK_TRANSFER',
            name: 'Banco Provincial',
            settlementCurrency: 'USD',
          ),
          VenuePaymentMethodDto(
            id: 'vpm-2',
            venueId: 'venue-1',
            type: 'CASH',
            name: 'Caja',
            settlementCurrency: 'USD',
          ),
        ],
      );
      getIt.registerSingleton<MonetizationRepository>(monetizationRepo);
    });

    testWidgets('PayMethodScreen usa métodos de sede y no legacy payment info', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: PayMethodScreen(
            matchId: 'm1',
            amountPerPersonCents: 5000,
            matchTitle: 'Club Palermo',
            venueId: 'venue-1',
            pricingCurrency: 'USD',
          ),
        ),
      );

      await tester.pumpAndSettle();

      verify(() => monetizationRepo.listVenuePaymentMethods(venueId: 'venue-1')).called(1);
      verifyNever(() => monetizationRepo.getMatchPaymentInfo(matchId: any(named: 'matchId')));

      expect(find.byKey(const Key('pay.method.screen')), findsOneWidget);
      expect(find.text('Transferencia bancaria'), findsOneWidget);
      expect(find.text('Efectivo'), findsOneWidget);
      expect(find.text('Continuar'), findsOneWidget);
    });

    testWidgets('WaitingConfirmationScreen refleja CONFIRMED tras poll', (tester) async {
      when(() => monetizationRepo.listMyTransactions(limit: any(named: 'limit'))).thenAnswer(
        (_) async => UserTransactionsResult(
          userId: 'u1',
          transactions: [
            TransactionDto(
              id: 'tx1',
              matchId: 'm1',
              userId: 'u1',
              amountBase: '50',
              feeAmount: '5',
              amountTotal: '55',
              status: 'CONFIRMED',
              paymentMethod: 'MANUAL',
              confirmedAt: DateTime.utc(2026, 5, 6),
              createdAt: DateTime.utc(2026, 5, 5),
            ),
          ],
        ),
      );

      await tester.pumpWidget(
        const MaterialApp(
          home: WaitingConfirmationScreen(
            matchId: 'm1',
            amountPerPersonCents: 5000,
            matchTitle: 'Club Palermo',
            pricingCurrency: 'USD',
            transactionId: 'tx1',
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byKey(const Key('pay.waiting.screen')), findsOneWidget);
      expect(find.text('¡Pago confirmado!'), findsOneWidget);
      expect(find.text('Confirmado'), findsOneWidget);
    });

    testWidgets(
      'Volver a pagar navega al formulario de método tras rechazo',
      (tester) async {
        when(() => monetizationRepo.listMyTransactions(limit: any(named: 'limit')))
            .thenAnswer(
          (_) async => UserTransactionsResult(
            userId: 'u1',
            transactions: [
              TransactionDto(
                id: 'tx1',
                matchId: 'm1',
                userId: 'u1',
                amountBase: '50',
                feeAmount: '5',
                amountTotal: '55',
                status: 'CANCELLED',
                paymentMethod: 'MANUAL',
                confirmedAt: null,
                createdAt: DateTime.utc(2026, 5, 5),
              ),
            ],
          ),
        );
        when(() => monetizationRepo.createMatchObligations(
              matchId: any(named: 'matchId'),
              amountBasePerPerson: any(named: 'amountBasePerPerson'),
              participantUserIds: any(named: 'participantUserIds'),
            )).thenAnswer(
          (_) async => {
            'created': [
              {'id': 'tx-new'},
            ],
          },
        );

        final router = GoRouter(
          routes: [
            GoRoute(
              path: '/',
              builder: (_, __) => const SizedBox(key: Key('home.stub')),
            ),
            GoRoute(
              path: '/matches/:matchId/pay/waiting',
              builder: (_, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                final amountCents = int.tryParse(
                      state.uri.queryParameters['amountCents'] ?? '',
                    ) ??
                    0;
                final title = state.uri.queryParameters['title'] ?? 'Partida';
                final currency = state.uri.queryParameters['currency'];
                final tx = state.uri.queryParameters['tx'];
                final venueId = state.uri.queryParameters['venueId'];
                return WaitingConfirmationScreen(
                  matchId: matchId,
                  amountPerPersonCents: amountCents,
                  matchTitle: title,
                  pricingCurrency: currency,
                  transactionId: tx,
                  venueId: venueId,
                );
              },
            ),
            GoRoute(
              path: '/matches/:matchId/pay/method',
              builder: (_, state) {
                final matchId = state.pathParameters['matchId'] ?? '';
                final amountCents = int.tryParse(
                      state.uri.queryParameters['amountCents'] ?? '',
                    ) ??
                    0;
                final title = state.uri.queryParameters['title'] ?? 'Partida';
                final venueId = state.uri.queryParameters['venueId'];
                final currency = state.uri.queryParameters['currency'];
                return PayMethodScreen(
                  matchId: matchId,
                  amountPerPersonCents: amountCents,
                  matchTitle: title,
                  venueId: venueId,
                  pricingCurrency: currency,
                );
              },
            ),
          ],
          initialLocation:
              '/matches/m1/pay/waiting?amountCents=5000&title=Club&tx=tx1&venueId=venue-1',
        );

        await tester.pumpWidget(MaterialApp.router(routerConfig: router));
        await tester.pumpAndSettle();

        expect(find.text('Pago no aceptado'), findsOneWidget);

        await tester.tap(find.text('Volver a pagar'));
        await tester.pumpAndSettle();

        expect(find.byKey(const Key('pay.method.screen')), findsOneWidget);
      },
    );
  });
}
