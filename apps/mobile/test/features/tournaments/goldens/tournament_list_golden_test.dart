import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_page.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/viewer_tournament_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournaments_home_screen.dart';
import 'package:cuadrala_mobile/src/features/venues/data/venues_repository.dart';

import 'tournament_golden.dart';

class _Tournaments extends Mock implements TournamentsRepository {}

class _Catalog extends Mock implements CatalogRepository {}

class _Profile extends Mock implements ProfileRepository {}

class _Venues extends Mock implements VenuesRepository {}

final _open = TournamentListItemDto(
  id: 'open',
  name: 'Copa Cuádrala',
  status: 'OPEN',
  sportName: 'Pádel',
  categoryName: '7ma',
  categoryId: 'cat',
  startsAt: DateTime(2026, 9, 12, 9),
  registrationCount: 11,
  maxSlots: 16,
  gender: 'MALE',
  inscriptionPrice: 15,
  venueName: 'Club Cuádrala',
  organizerName: 'Club Cuádrala',
  distanceKm: 1.2,
  registrationClosesAt: DateTime(2026, 9, 11, 20),
);
const _live = TournamentListItemDto(
  id: 'live',
  name: 'Liga Base Aérea',
  status: 'IN_PROGRESS',
  sportName: 'Pádel',
  categoryName: '7ma',
  categoryId: 'cat',
  startsAt: null,
  registrationCount: 5,
);

void main() {
  setUpAll(loadTournamentGoldenFonts);
  tearDown(() async => getIt.reset());

  for (final brightness in Brightness.values) {
    for (final scenario in [
      'explore',
      'mine',
      'empty',
      'loading',
      'error',
      'mine_error',
    ]) {
      testWidgets('should render $scenario ${brightness.name} at 402x874', (
        tester,
      ) async {
        await getIt.reset();
        final tournaments = _Tournaments();
        final catalog = _Catalog();
        final profile = _Profile();
        final venues = _Venues();
        getIt.registerSingleton<TournamentsRepository>(tournaments);
        getIt.registerSingleton<CatalogRepository>(catalog);
        getIt.registerSingleton<ProfileRepository>(profile);
        getIt.registerSingleton<VenuesRepository>(venues);
        when(() => catalog.listSports()).thenAnswer((_) async => []);
        when(
          () => venues.listVenues(
            page: any(named: 'page'),
            limit: any(named: 'limit'),
          ),
        ).thenAnswer((_) async => []);
        when(() => profile.getMe()).thenAnswer(
          (_) async => const UserMeDto(
            id: 'me',
            name: 'Ana',
            email: 'ana@example.com',
            subscriptionType: 'FREE',
            primaryRating: UserPrimaryRatingDto(
              categoryId: 'cat',
              categoryName: '7ma',
              sportId: 'sport',
              rating: 7,
            ),
          ),
        );
        final viewer = ViewerTournamentDto(
          tournament: _open,
          registrationStatus: null,
          pendingInvitationId: null,
          isOrganizer: true,
          pendingRegistrationsCount: 4,
        );
        if (scenario == 'mine_error') {
          when(
            () => tournaments.listMyTournaments(),
          ).thenThrow(Exception('offline'));
        } else {
          when(() => tournaments.listMyTournaments()).thenAnswer(
            (_) async => scenario == 'mine'
                ? [
                    viewer,
                    const ViewerTournamentDto(
                      tournament: _live,
                      registrationStatus: 'CONFIRMED',
                      pendingInvitationId: null,
                      isOrganizer: false,
                      pendingRegistrationsCount: null,
                    ),
                  ]
                : [],
          );
        }
        Future<TournamentListPage> call() => tournaments.listTournaments(
          page: any(named: 'page'),
          limit: any(named: 'limit'),
          filters: any(named: 'filters'),
        );
        if (scenario == 'loading') {
          when(call).thenAnswer((_) => Completer<TournamentListPage>().future);
        } else if (scenario == 'error') {
          when(call).thenThrow(Exception('offline'));
        } else {
          when(call).thenAnswer(
            (_) async => TournamentListPage(
              items: scenario == 'empty' ? [] : [_open, _live],
              page: 1,
              limit: 20,
              total: scenario == 'empty' ? 0 : 2,
            ),
          );
        }
        await pumpTournamentGolden(
          tester,
          child: const TournamentsHomeScreen(),
          brightness: brightness,
        );
        await tester.pump(const Duration(milliseconds: 300));
        if (scenario.startsWith('mine')) {
          await tester.tap(find.text('Mis torneos'));
          await tester.pump(const Duration(milliseconds: 300));
        }
        expect(tester.takeException(), isNull);
        await expectLater(
          find.byKey(tournamentGoldenKey),
          matchesGoldenFile('list_${scenario}_${brightness.name}.png'),
        );
      });
    }
  }
}
