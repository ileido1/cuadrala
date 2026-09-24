import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/quick_match/data/models/quick_match_search_dto.dart';
import 'package:cuadrala_mobile/src/features/quick_match/data/quick_match_repository.dart';
import 'package:cuadrala_mobile/src/features/quick_match/presentation/cubit/quick_match_cubit.dart';
import 'package:cuadrala_mobile/src/features/quick_match/presentation/quick_match_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockQuickMatchRepository extends Mock implements QuickMatchRepository {}

class _MockCatalogRepository extends Mock implements CatalogRepository {}

class _MockMatchesRepository extends Mock implements MatchesRepository {}

QuickMatchSearchDto _searching() => QuickMatchSearchDto(
  id: 'search-1',
  sportId: 'sport-1',
  categoryId: 'category-1',
  status: 'SEARCHING',
  noMatchYet: false,
  slots: const ['EVENING'],
  targetDate: DateTime(2030, 6, 1),
  widenLevel: false,
  zoneKm: 5,
  includeOpenMatches: true,
  proposal: null,
);

QuickMatchSearchDto _openMatchProposal() => QuickMatchSearchDto(
  id: 'search-1',
  sportId: 'sport-1',
  categoryId: 'category-1',
  status: 'PROPOSAL',
  noMatchYet: false,
  slots: const ['EVENING'],
  targetDate: DateTime(2030, 6, 1),
  widenLevel: false,
  zoneKm: 5,
  includeOpenMatches: true,
  proposal: QuickMatchProposalDto(
    id: 'proposal-1',
    type: 'OPEN_MATCH',
    status: 'PENDING',
    matchId: 'match-1',
    expiresAt: DateTime.now().add(const Duration(minutes: 2)),
  ),
);

MatchDetailDto _matchDetail() => MatchDetailDto(
  id: 'match-1',
  sportId: 'sport-1',
  categoryId: 'category-1',
  categoryName: '7ma',
  type: 'OPEN',
  status: 'SCHEDULED',
  scheduledAt: DateTime(2030, 6, 1, 20),
  pricePerPlayerCents: 900,
  maxParticipants: 4,
  participantCount: 3,
  openSpots: 1,
  courtId: 'court-1',
  venueId: 'venue-1',
  clubName: 'Club Cuádrala',
  courtName: 'Cancha 2',
  locationLabel: 'Las Mercedes, Caracas',
  tournamentId: null,
  participants: [
    MatchParticipantDto(
      userId: 'player-1',
      displayName: 'Carlos R.',
      joinedAt: DateTime(2030),
    ),
    MatchParticipantDto(
      userId: 'player-2',
      displayName: 'Ana M.',
      joinedAt: DateTime(2030),
    ),
    MatchParticipantDto(
      userId: 'player-3',
      displayName: 'Luis P.',
      joinedAt: DateTime(2030),
    ),
  ],
  createdAt: DateTime(2030),
  updatedAt: DateTime(2030),
  pricingCurrency: 'USD',
  displayCurrency: 'USD',
);

Widget _wrap(QuickMatchCubit cubit) => MaterialApp(
  theme: AppTheme.dark(),
  home: BlocProvider<QuickMatchCubit>.value(
    value: cubit,
    child: const QuickMatchScreen(),
  ),
);

void main() {
  late _MockQuickMatchRepository repository;
  late _MockCatalogRepository catalog;
  late _MockMatchesRepository matches;
  late QuickMatchCubit cubit;

  setUp(() {
    repository = _MockQuickMatchRepository();
    catalog = _MockCatalogRepository();
    matches = _MockMatchesRepository();
    cubit = QuickMatchCubit(repository: repository, catalogRepository: catalog);
    getIt.registerSingleton<MatchesRepository>(matches);
  });

  tearDown(() {
    cubit.close();
    getIt.unregister<MatchesRepository>();
  });

  testWidgets('renders the active queue handoff hierarchy while searching', (
    tester,
  ) async {
    when(() => repository.current()).thenAnswer((_) async => _searching());

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('Búsqueda activa'), findsOneWidget);
    expect(find.text('Buscando jugadores'), findsOneWidget);
    expect(find.text('Revisando partidas abiertas'), findsOneWidget);
    expect(find.text('Editar preferencias'), findsOneWidget);
    expect(find.text('Salir de la cola'), findsOneWidget);
  });

  testWidgets('renders an open-match proposal with its explicit cup action', (
    tester,
  ) async {
    when(
      () => repository.current(),
    ).thenAnswer((_) async => _openMatchProposal());
    when(
      () => matches.getMatchDetail('match-1'),
    ).thenAnswer((_) async => _matchDetail());

    await tester.pumpWidget(_wrap(cubit));
    await tester.pumpAndSettle();

    expect(find.text('Partida abierta con cupo'), findsOneWidget);
    expect(find.text('¡Partida encontrada!'), findsOneWidget);
    expect(find.text('Club Cuádrala · Cancha 2'), findsOneWidget);
    expect(find.text('US\$9.00 p/p'), findsOneWidget);
    expect(find.text('Confirmar cupo'), findsOneWidget);
    expect(find.text('Seguir buscando'), findsOneWidget);
  });
}
