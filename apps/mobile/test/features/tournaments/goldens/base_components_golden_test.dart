import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:cuadrala_mobile/src/core/theme/app_icons.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/tournament_list_item_tile.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/tournament_primitives.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/tournament_status_pill.dart';
import 'package:cuadrala_mobile/src/shared/widgets/app_header.dart';
import 'tournament_golden.dart';

void main() {
  setUpAll(loadTournamentGoldenFonts);
  for (final brightness in Brightness.values) {
    testWidgets(
      'should match base components at 402x874 when ${brightness.name}',
      (tester) async {
        await pumpTournamentGolden(
          tester,
          brightness: brightness,
          child: Scaffold(
            body: Column(
              children: [
                const AppHeader(
                  title: 'Torneos',
                  tournamentStyle: true,
                  subtitle: 'Encontrá tu próximo desafío',
                  rightAction: TournamentStatusPill(
                    status: 'OPEN',
                    short: true,
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          children: [
                            TournamentFilterChip(
                              label: 'Categoría',
                              active: true,
                              onTap: () {},
                            ),
                            TournamentFilterChip(label: 'Cerca', onTap: () {}),
                          ],
                        ),
                        const SizedBox(height: 12),
                        const TournamentBanner(
                          icon: AppIcons.mail,
                          tone: TournamentTone.lime,
                          title: 'Tenés una invitación',
                          body: 'Te invitaron a jugar un torneo.',
                          action: 'Ver invitación',
                        ),
                        const SizedBox(height: 12),
                        TournamentListItemTile(
                          tournament: TournamentListItemDto(
                            id: 't1',
                            name: 'Copa Cuádrala',
                            status: 'OPEN',
                            sportName: 'Pádel',
                            categoryId: 'cat',
                            categoryName: '7ma',
                            startsAt: DateTime(2026, 9, 12, 9),
                            registrationCount: 11,
                            maxSlots: 16,
                            venueName: 'Club Cuádrala',
                            distanceKm: 1.2,
                            inscriptionPrice: 15,
                            gender: 'MALE',
                          ),
                          matchesCategory: true,
                        ),
                        const TournamentFactRow(
                          icon: AppIcons.check,
                          label: 'Nivel',
                          value: '7ma categoría',
                          sub: 'Es tu categoría',
                          ok: true,
                        ),
                        const SizedBox(height: 12),
                        const Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            TournamentStatusPill(status: 'DRAFT'),
                            TournamentStatusPill(status: 'IN_PROGRESS'),
                            TournamentStatusPill(status: 'COMPLETED'),
                            TournamentStatusPill(status: 'CANCELLED'),
                            TournamentViewerBadge(isOrganizer: true),
                            TournamentViewerBadge(invited: true),
                            TournamentViewerBadge(
                              registrationStatus: 'PENDING',
                            ),
                            TournamentViewerBadge(
                              registrationStatus: 'CONFIRMED',
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        const TournamentCupoBar(count: 16, capacity: 16),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
        expect(tester.takeException(), isNull);
        await expectLater(
          find.byKey(tournamentGoldenKey),
          matchesGoldenFile('base_${brightness.name}.png'),
        );
      },
    );
  }
}
