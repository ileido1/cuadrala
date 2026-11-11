import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/data/exchange_rates_repository.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/match_lifecycle_screen.dart';
import 'package:cuadrala_mobile/src/features/monetization/data/monetization_repository.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

import '../../../helpers/golden_harness.dart';

class _MockMatchesRepository extends Mock implements MatchesRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockMonetizationRepository extends Mock
    implements MonetizationRepository {}

class _MockExchangeRatesRepository extends Mock
    implements ExchangeRatesRepository {}

const _matchId = 'match-1';
const _viewerId = 'user-1';

MatchDetailDto _buildMatch({required String status}) {
  final at = DateTime(2030, 6, 1, 19);
  return MatchDetailDto(
    id: _matchId,
    sportId: 'sport',
    categoryId: 'cat',
    type: 'REGULAR',
    status: status,
    scheduledAt: at,
    pricePerPlayerCents: 0,
    maxParticipants: 4,
    participantCount: 2,
    openSpots: 2,
    courtId: null,
    clubName: 'Club Cuádrala',
    courtName: 'Cancha 1',
    locationLabel: 'Las Mercedes, Caracas',
    tournamentId: null,
    participants: [
      MatchParticipantDto(userId: _viewerId, joinedAt: DateTime(2030, 5, 28)),
      MatchParticipantDto(userId: 'other-22', joinedAt: DateTime(2030, 5, 30)),
    ],
    createdAt: at,
    updatedAt: at,
  );
}

//? Issue #116: match_lifecycle_screen.dart no tenía golden. Cubre las dos
//? fases con acciones: "scheduled" (Cancelar + Iniciar) e "in_progress"
//? (Finalizar), con fechas fijas.
void main() {
  late _MockMatchesRepository matchesRepository;
  late _MockProfileRepository profileRepository;
  late _MockExchangeRatesRepository exchangeRatesRepository;

  setUpAll(loadGoldenFonts);

  setUp(() {
    matchesRepository = _MockMatchesRepository();
    profileRepository = _MockProfileRepository();
    exchangeRatesRepository = _MockExchangeRatesRepository();

    getIt.registerSingleton<MatchesRepository>(matchesRepository);
    getIt.registerSingleton<ProfileRepository>(profileRepository);
    getIt.registerSingleton<MonetizationRepository>(
      _MockMonetizationRepository(),
    );
    getIt.registerSingleton<ExchangeRatesRepository>(exchangeRatesRepository);

    when(() => profileRepository.getMe()).thenAnswer(
      (_) async => const UserMeDto(
        id: _viewerId,
        email: 'u@test.local',
        name: 'User',
        subscriptionType: 'FREE',
      ),
    );
    when(
      () => exchangeRatesRepository.listByCountry(
        countryCode: any(named: 'countryCode'),
      ),
    ).thenAnswer((_) async => const []);
  });

  tearDown(() {
    getIt.unregister<MatchesRepository>();
    getIt.unregister<ProfileRepository>();
    getIt.unregister<MonetizationRepository>();
    getIt.unregister<ExchangeRatesRepository>();
  });

  for (final brightness in Brightness.values) {
    for (final (state, status) in [
      ('scheduled', 'SCHEDULED'),
      ('in_progress', 'IN_PROGRESS'),
    ]) {
      testWidgets('$state ${brightness.name}', (tester) async {
        when(
          () => matchesRepository.getMatchById(_matchId),
        ).thenAnswer((_) async => _buildMatch(status: status));

        await pumpGolden(
          tester,
          brightness: brightness,
          child: const MatchLifecycleScreen(matchId: _matchId),
        );
        await tester.pumpAndSettle();

        await expectLater(
          find.byKey(goldenKey),
          matchesGoldenFile(
            'goldens/match_lifecycle_screen_${state}_${brightness.name}.png',
          ),
        );
      });
    }
  }
}
