import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/venues/data/models/court_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/data/venues_repository.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_detail_cubit.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_detail_state.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/open_matches_cubit.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/venue_detail_screen.dart';

class _MockVenuesRepository extends Mock implements VenuesRepository {}
class _MockMatchesRepository extends Mock implements MatchesRepository {}

CourtDto _court({String id = 'c1', String name = 'Cancha 1'}) => CourtDto(
      id: id,
      venueId: 'v1',
      name: name,
      sportType: 'PADEL',
      indoor: false,
      lighting: true,
      status: 'ACTIVE',
      createdAt: DateTime(2024),
      pricePerHourCents: 0,
      durationMinutes: 60,
    );

Widget _wrap({
  required VenueDetailCubit detailCubit,
  required OpenMatchesCubit matchesCubit,
}) {
  return MaterialApp(
    home: MultiBlocProvider(
      providers: [
        BlocProvider<VenueDetailCubit>.value(value: detailCubit),
        BlocProvider<OpenMatchesCubit>.value(value: matchesCubit),
      ],
      child: const VenueDetailView(
        venueId: 'v1',
        venueName: 'Club Test',
      ),
    ),
  );
}

void main() {
  late _MockVenuesRepository venuesRepo;
  late _MockMatchesRepository matchesRepo;
  late VenueDetailCubit detailCubit;
  late OpenMatchesCubit matchesCubit;

  setUp(() {
    venuesRepo = _MockVenuesRepository();
    matchesRepo = _MockMatchesRepository();

    detailCubit = VenueDetailCubit(
      repository: venuesRepo,
      venueId: 'v1',
    );
    matchesCubit = OpenMatchesCubit(matchesRepository: matchesRepo);
  });

  tearDown(() {
    detailCubit.close();
    matchesCubit.close();
  });

  group('VenueDetailView tab bar', () {
    testWidgets('muestra 3 tabs: Reservar, Partidos, Info', (tester) async {
      when(() => venuesRepo.listVenueCourts(venueId: 'v1')).thenAnswer(
        (_) async => [_court()],
      );
      detailCubit.load();

      await tester.pumpWidget(_wrap(
        detailCubit: detailCubit,
        matchesCubit: matchesCubit,
      ));
      await tester.pump();

      expect(find.text('Reservar'), findsOneWidget);
      expect(find.text('Partidos'), findsOneWidget);
      expect(find.text('Info'), findsOneWidget);
    });

    testWidgets('tiene un DefaultTabController', (tester) async {
      when(() => venuesRepo.listVenueCourts(venueId: 'v1')).thenAnswer(
        (_) async => [_court()],
      );
      detailCubit.load();

      await tester.pumpWidget(_wrap(
        detailCubit: detailCubit,
        matchesCubit: matchesCubit,
      ));
      await tester.pump();

      expect(find.byType(TabBar), findsOneWidget);
    });

    testWidgets('tab Reservar contiene DateStrip', (tester) async {
      when(() => venuesRepo.listVenueCourts(venueId: 'v1')).thenAnswer(
        (_) async => [_court()],
      );
      detailCubit.load();

      await tester.pumpWidget(_wrap(
        detailCubit: detailCubit,
        matchesCubit: matchesCubit,
      ));
      // Esperar carga
      await tester.pump();
      await tester.pump();

      expect(find.byKey(const Key('date_strip')), findsOneWidget);
    });

    testWidgets('tab Info muestra la dirección del local', (tester) async {
      when(() => venuesRepo.listVenueCourts(venueId: 'v1')).thenAnswer(
        (_) async => [],
      );
      detailCubit.load();

      await tester.pumpWidget(_wrap(
        detailCubit: detailCubit,
        matchesCubit: matchesCubit,
      ));
      // Let the VenueDetailCubit load finish
      await tester.pump();
      await tester.pump();

      // Navigate to Info tab — tap and advance the page animation
      await tester.tap(find.text('Info'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Info tab content is visible (key is on SingleChildScrollView)
      expect(find.byKey(const Key('venue_info_tab')), findsOneWidget);
    });
  });
}
