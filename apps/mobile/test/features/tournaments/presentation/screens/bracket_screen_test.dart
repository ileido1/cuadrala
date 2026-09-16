import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/theme/app_icons.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/bracket_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/screens/bracket_screen.dart';
import 'package:cuadrala_mobile/src/shared/widgets/app_header.dart';

class _TestTournamentsRepository implements TournamentsRepository {
  final Future<BracketDto> Function()? bracketProvider;

  _TestTournamentsRepository({this.bracketProvider});

  @override
  Future<BracketDto> getBracket({required String tournamentId}) {
    if (bracketProvider != null) {
      return bracketProvider!();
    }
    throw UnimplementedError();
  }

  @override
  noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('BracketScreen', () {
    Widget buildTestWidget(TournamentsRepository repository) => MaterialApp(
      home: Scaffold(
        body: BracketScreen(
          tournamentId: 't-1',
          tournamentsRepository: repository,
        ),
      ),
    );

    testWidgets('displays bracket data when loaded successfully', (
      tester,
    ) async {
      final bracket = BracketDto(
        tournamentId: 't-1',
        tournamentName: 'Test Tournament',
        totalRounds: 2,
        bracketSize: 4,
        rounds: [
          BracketRoundDto(
            roundNumber: 1,
            name: 'Semifinales',
            matches: [
              BracketMatchDto(
                matchNumber: 1,
                roundNumber: 1,
                playerA: BracketPlayerDto(
                  userId: 'u-1',
                  displayName: 'Player A',
                  seedPosition: 1,
                ),
                playerB: BracketPlayerDto(
                  userId: 'u-2',
                  displayName: 'Player B',
                  seedPosition: 4,
                ),
                winnerId: null,
                score: null,
                status: 'PENDING',
                matchId: 'm-1',
              ),
            ],
          ),
        ],
      );

      final repository = _TestTournamentsRepository(
        bracketProvider: () async => bracket,
      );

      await tester.pumpWidget(buildTestWidget(repository));
      await tester.pumpAndSettle();

      //? M9: el nombre del torneo y el tamaño del cuadro se muestran en el
      //? subtítulo del AppHeader ("Cuadro" + "{nombre} · {size} jugadores"),
      //? no como texto suelto en el cuerpo (`SheetHeader`, `design` D-Cuadro).
      expect(find.byType(AppHeader), findsOneWidget);
      expect(find.text('Cuadro'), findsOneWidget);
      expect(find.text('Test Tournament · 4 jugadores'), findsOneWidget);
      //? Round titles render uppercase (README: "título de ronda 11.5/800
      //? uppercase").
      expect(find.text('SEMIFINALES'), findsOneWidget);
      expect(find.text('Semifinales'), findsNothing);
      expect(find.text('Player A'), findsOneWidget);
      expect(find.text('Player B'), findsOneWidget);
    });

    testWidgets('shows a back action, not swipe-only dismiss', (tester) async {
      final repository = _TestTournamentsRepository(
        bracketProvider: () async => BracketDto(
          tournamentId: 't-1',
          tournamentName: 'Test',
          totalRounds: 1,
          bracketSize: 2,
          rounds: const [],
        ),
      );

      await tester.pumpWidget(buildTestWidget(repository));
      await tester.pumpAndSettle();

      expect(find.byIcon(AppIcons.chevronLeft), findsOneWidget);
    });

    testWidgets('footer note reads exactly the handoff copy, no added clause', (
      tester,
    ) async {
      final repository = _TestTournamentsRepository(
        bracketProvider: () async => BracketDto(
          tournamentId: 't-1',
          tournamentName: 'Test',
          totalRounds: 1,
          bracketSize: 2,
          rounds: const [],
        ),
      );

      await tester.pumpWidget(buildTestWidget(repository));
      await tester.pumpAndSettle();

      expect(
        find.text(
          'Los invitados participan del cuadro como cualquier participante confirmado.',
        ),
        findsOneWidget,
      );
      expect(
        find.text(
          'Los invitados (inscritos sin cuenta) no entran al cuadro: sólo jugadores con cuenta.',
        ),
        findsNothing,
      );
    });

    testWidgets('shows BYE match correctly', (tester) async {
      final bracket = BracketDto(
        tournamentId: 't-1',
        tournamentName: 'Test',
        totalRounds: 1,
        bracketSize: 2,
        rounds: [
          BracketRoundDto(
            roundNumber: 1,
            name: 'Finales',
            matches: [
              BracketMatchDto(
                matchNumber: 1,
                roundNumber: 1,
                playerA: null,
                playerB: null,
                winnerId: null,
                score: null,
                status: 'BYE',
                matchId: 'm-1',
              ),
            ],
          ),
        ],
      );

      final repository = _TestTournamentsRepository(
        bracketProvider: () async => bracket,
      );

      await tester.pumpWidget(buildTestWidget(repository));
      await tester.pumpAndSettle();

      expect(find.text('Bye'), findsOneWidget);
    });

    testWidgets('shows winner styling without an invented checkmark icon', (
      tester,
    ) async {
      final bracket = BracketDto(
        tournamentId: 't-1',
        tournamentName: 'Test',
        totalRounds: 1,
        bracketSize: 2,
        rounds: [
          BracketRoundDto(
            roundNumber: 1,
            name: 'Finales',
            matches: [
              BracketMatchDto(
                matchNumber: 1,
                roundNumber: 1,
                playerA: BracketPlayerDto(
                  userId: 'u-1',
                  displayName: 'Winner',
                  seedPosition: 1,
                ),
                playerB: BracketPlayerDto(
                  userId: 'u-2',
                  displayName: 'Loser',
                  seedPosition: 2,
                ),
                winnerId: 'u-1',
                score: [
                  BracketScoreEntryDto(userId: 'u-1', points: 6),
                  BracketScoreEntryDto(userId: 'u-2', points: 4),
                ],
                status: 'COMPLETED',
                matchId: 'm-1',
              ),
            ],
          ),
        ],
      );

      final repository = _TestTournamentsRepository(
        bracketProvider: () async => bracket,
      );

      await tester.pumpWidget(buildTestWidget(repository));
      await tester.pumpAndSettle();

      //? El handoff (`cuadrala-torneos.jsx:459-467`) no dibuja ningún ícono de
      //? check junto al ganador — sólo el peso de fuente y el color del score
      //? distinguen al ganador. El check-circle era una extra inventada.
      expect(find.byIcon(AppIcons.checkCircle), findsNothing);
      expect(find.text('6-4'), findsOneWidget);
    });

    testWidgets(
      'in-progress match uses a ring treatment, not a blur/spread shadow',
      (tester) async {
        final bracket = BracketDto(
          tournamentId: 't-1',
          tournamentName: 'Test',
          totalRounds: 1,
          bracketSize: 2,
          rounds: [
            BracketRoundDto(
              roundNumber: 1,
              name: 'Finales',
              matches: [
                BracketMatchDto(
                  matchNumber: 1,
                  roundNumber: 1,
                  playerA: BracketPlayerDto(
                    userId: 'u-1',
                    displayName: 'Player A',
                    seedPosition: 1,
                  ),
                  playerB: BracketPlayerDto(
                    userId: 'u-2',
                    displayName: 'Player B',
                    seedPosition: 2,
                  ),
                  winnerId: null,
                  score: null,
                  status: 'IN_PROGRESS',
                  matchId: 'm-1',
                ),
              ],
            ),
          ],
        );

        final repository = _TestTournamentsRepository(
          bracketProvider: () async => bracket,
        );

        await tester.pumpWidget(buildTestWidget(repository));
        await tester.pumpAndSettle();

        //? Handoff: "EN JUEGO" siempre en mayúsculas (`cuadrala-torneos.jsx:476`).
        expect(find.text('EN JUEGO'), findsOneWidget);

        final card = tester.widget<Container>(
          find.byKey(const Key('bracket.matchCard.m-1')),
        );
        final decoration = card.decoration as BoxDecoration;
        final border = decoration.border! as Border;
        //? `border: 1.5px solid ${live ? 'var(--green)' : 'var(--line)'}` —
        //? el ancho es siempre 1.5, sólo el color cambia (`:471`).
        expect(border.top.width, 1.5);
        //? `boxShadow: '0 0 0 3px var(--green-bg)'` — anillo sólido sin blur,
        //? no la aproximación previa de blur/spread (`:472`).
        expect(decoration.boxShadow, isNotNull);
        expect(decoration.boxShadow!.single.blurRadius, 0);
        expect(decoration.boxShadow!.single.spreadRadius, 3);
      },
    );

    testWidgets('pending match keeps title-case label, not uppercased', (
      tester,
    ) async {
      final bracket = BracketDto(
        tournamentId: 't-1',
        tournamentName: 'Test',
        totalRounds: 1,
        bracketSize: 2,
        rounds: [
          BracketRoundDto(
            roundNumber: 1,
            name: 'Finales',
            matches: [
              BracketMatchDto(
                matchNumber: 1,
                roundNumber: 1,
                playerA: BracketPlayerDto(
                  userId: 'u-1',
                  displayName: 'Player A',
                  seedPosition: 1,
                ),
                playerB: BracketPlayerDto(
                  userId: 'u-2',
                  displayName: 'Player B',
                  seedPosition: 2,
                ),
                winnerId: null,
                score: null,
                status: 'PENDING',
                matchId: 'm-1',
              ),
            ],
          ),
        ],
      );

      final repository = _TestTournamentsRepository(
        bracketProvider: () async => bracket,
      );

      await tester.pumpWidget(buildTestWidget(repository));
      await tester.pumpAndSettle();

      //? README/jsx: sólo "EN JUEGO" está en mayúsculas; "Pendiente" queda tal
      //? cual (copia verbatim, no un `.toUpperCase()` genérico por estado).
      expect(find.text('Pendiente'), findsOneWidget);
      expect(find.text('PENDIENTE'), findsNothing);
    });

    testWidgets('horizontal scroll works for multiple rounds', (tester) async {
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final bracket = BracketDto(
        tournamentId: 't-1',
        tournamentName: 'Test',
        totalRounds: 3,
        bracketSize: 8,
        rounds: [
          for (int i = 1; i <= 3; i++)
            BracketRoundDto(
              roundNumber: i,
              name: 'Ronda $i',
              matches: [
                BracketMatchDto(
                  matchNumber: i,
                  roundNumber: i,
                  playerA: BracketPlayerDto(
                    userId: 'u-$i',
                    displayName: 'Player $i',
                    seedPosition: i,
                  ),
                  playerB: null,
                  winnerId: null,
                  score: null,
                  status: 'PENDING',
                  matchId: 'm-$i',
                ),
              ],
            ),
        ],
      );

      final repository = _TestTournamentsRepository(
        bracketProvider: () async => bracket,
      );

      await tester.pumpWidget(buildTestWidget(repository));
      await tester.pumpAndSettle();

      expect(find.text('RONDA 1'), findsOneWidget);
      expect(find.text('RONDA 2'), findsOneWidget);
      expect(find.text('RONDA 3'), findsOneWidget);
    });
  });
}
