import 'package:bloc_test/bloc_test.dart';
import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/quick_match/data/models/quick_match_search_dto.dart';
import 'package:cuadrala_mobile/src/features/quick_match/data/quick_match_repository.dart';
import 'package:cuadrala_mobile/src/features/quick_match/presentation/cubit/quick_match_cubit.dart';
import 'package:cuadrala_mobile/src/features/quick_match/presentation/cubit/quick_match_state.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _QuickMatchRepository extends Mock implements QuickMatchRepository {}

class _CatalogRepository extends Mock implements CatalogRepository {}

final _search = QuickMatchSearchDto(
  id: 'search',
  sportId: 'sport',
  categoryId: 'category',
  status: 'PROPOSAL',
  noMatchYet: false,
  slots: ['EVENING'],
  targetDate: DateTime.utc(2030),
  widenLevel: false,
  zoneKm: 10,
  includeOpenMatches: true,
  proposal: QuickMatchProposalDto(
    id: 'proposal',
    type: 'OPEN_MATCH',
    status: 'PENDING',
    matchId: 'match',
    expiresAt: DateTime.utc(2030),
  ),
);

void main() {
  late _QuickMatchRepository repository;
  late _CatalogRepository catalog;

  setUp(() {
    repository = _QuickMatchRepository();
    catalog = _CatalogRepository();
  });

  QuickMatchCubit build() =>
      QuickMatchCubit(repository: repository, catalogRepository: catalog);

  blocTest<QuickMatchCubit, QuickMatchState>(
    'should expose an active proposal when a persisted search exists',
    build: build,
    setUp: () => when(repository.current).thenAnswer((_) async => _search),
    act: (cubit) => cubit.load(),
    expect: () => [isA<QuickMatchLoading>(), isA<QuickMatchActive>()],
  );

  blocTest<QuickMatchCubit, QuickMatchState>(
    'should clear the queue when cancellation succeeds',
    build: build,
    setUp: () => when(repository.cancel).thenAnswer((_) async {}),
    act: (cubit) => cubit.cancel(),
    expect: () => [isA<QuickMatchIdle>()],
  );

  //? Antes la excepción escapaba sin manejar: "Salir de la cola" no hacía
  //? nada visible y el jugador no sabía que había fallado.
  blocTest<QuickMatchCubit, QuickMatchState>(
    'should report a failure when cancellation fails',
    build: build,
    seed: () => QuickMatchActive(_search),
    setUp: () => when(repository.cancel).thenThrow(
      const AppFailure(code: 'NETWORK_TIMEOUT', message: 'timeout'),
    ),
    act: (cubit) => cubit.cancel(),
    expect: () => [const QuickMatchFailure('timeout')],
  );

  blocTest<QuickMatchCubit, QuickMatchState>(
    'should restart the queue with the selected schedule',
    build: build,
    seed: () => QuickMatchActive(_search),
    setUp: () => when(() => repository.start(any())).thenAnswer((_) async => _search),
    act: (cubit) => cubit.changeSchedule(
      day: 'TOMORROW',
      slots: ['MORNING'],
    ),
    verify: (_) {
      verify(() => repository.start({
        'sportId': 'sport',
        'categoryId': 'category',
        'day': 'TOMORROW',
        'slots': ['MORNING'],
        'widenLevel': false,
        'zoneKm': 10,
        'includeOpenMatches': true,
      })).called(1);
    },
    expect: () => [isA<QuickMatchLoading>(), isA<QuickMatchActive>()],
  );

  blocTest<QuickMatchCubit, QuickMatchState>(
    'should surface the backend error message when loading fails',
    build: build,
    setUp: () => when(repository.current).thenThrow(
      const AppFailure(code: 'SERVER_DOWN', message: 'El servidor no responde.'),
    ),
    act: (cubit) => cubit.load(),
    expect: () => [
      isA<QuickMatchLoading>(),
      isA<QuickMatchFailure>().having(
        (s) => s.message,
        'message',
        'El servidor no responde.',
      ),
    ],
  );

  blocTest<QuickMatchCubit, QuickMatchState>(
    'should fall back to a generic message when loading fails without an AppFailure',
    build: build,
    setUp: () => when(repository.current).thenThrow(Exception('boom')),
    act: (cubit) => cubit.load(),
    expect: () => [
      isA<QuickMatchLoading>(),
      isA<QuickMatchFailure>().having(
        (s) => s.message,
        'message',
        'No pudimos cargar tu búsqueda.',
      ),
    ],
  );

  blocTest<QuickMatchCubit, QuickMatchState>(
    'should surface the backend error message when starting the search fails',
    build: build,
    setUp: () => when(() => repository.start(any())).thenThrow(
      const AppFailure(code: 'CANCHA_REQUERIDA', message: 'Debes elegir una cancha.'),
    ),
    act: (cubit) => cubit.start({'sportId': 'sport'}),
    expect: () => [
      isA<QuickMatchLoading>(),
      isA<QuickMatchFailure>().having(
        (s) => s.message,
        'message',
        'Debes elegir una cancha.',
      ),
    ],
  );

  blocTest<QuickMatchCubit, QuickMatchState>(
    'should surface the backend error message when confirming a proposal fails',
    build: build,
    setUp: () => when(() => repository.confirmProposal(option: any(named: 'option')))
        .thenThrow(
      const AppFailure(code: 'PROPUESTA_VENCIDA', message: 'La propuesta venció.'),
    ),
    act: (cubit) => cubit.confirmProposal(),
    expect: () => [
      isA<QuickMatchFailure>().having(
        (s) => s.message,
        'message',
        'La propuesta venció.',
      ),
    ],
  );

  blocTest<QuickMatchCubit, QuickMatchState>(
    'should surface the backend error message when dismissing a proposal fails',
    build: build,
    setUp: () => when(repository.dismissProposal).thenThrow(
      const AppFailure(code: 'CANCHA_NO_DISPONIBLE', message: 'La cancha ya no está disponible.'),
    ),
    act: (cubit) => cubit.dismissProposal(),
    expect: () => [
      isA<QuickMatchFailure>().having(
        (s) => s.message,
        'message',
        'La cancha ya no está disponible.',
      ),
    ],
  );

  blocTest<QuickMatchCubit, QuickMatchState>(
    'should expand the search radius by ten kilometers',
    build: build,
    seed: () => QuickMatchActive(_search),
    setUp: () => when(() => repository.start(any())).thenAnswer((_) async => _search),
    act: (cubit) => cubit.expandZone(),
    verify: (_) {
      final captured = verify(() => repository.start(captureAny())).captured.single
          as Map<String, Object?>;
      expect(captured['zoneKm'], 20);
      expect(captured['sportId'], 'sport');
      expect(captured['categoryId'], 'category');
    },
    expect: () => [isA<QuickMatchLoading>(), isA<QuickMatchActive>()],
  );
}
