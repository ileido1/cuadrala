import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/theme/app_icons.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/court_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/venue_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/slot_info.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_booking_cubit.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_booking_state.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/venue_booking_form.dart';

class _MockVenueBookingCubit extends MockCubit<VenueBookingState>
    implements VenueBookingCubit {}

/// "Hoy" fijo: sábado 1 de junio de 2030.
final _now = DateTime(2030, 6, 1);

const _venue = VenueDto(
  id: 'venue-1',
  name: 'Club Cuádrala',
  address: 'Av. Principal',
  latitude: 10.48,
  longitude: -66.86,
);

CourtDto _court(String id, String name) => CourtDto(
  id: id,
  venueId: 'venue-1',
  name: name,
  sportType: 'PADEL',
  indoor: true,
  lighting: true,
  status: 'ACTIVE',
  createdAt: DateTime(2030, 1, 1),
  pricePerHourCents: 2000,
  durationMinutes: 90,
);

VenueBookingState _state({
  bool loading = false,
  String? selectedCourtId,
  String? selectedSlot,
  String? categoryId = 'cat-1',
  int maxParticipants = 4,
  String? error,
  String? submittedMatchId,
}) {
  return VenueBookingState(
    venue: _venue,
    selectedDate: _now,
    loading: loading,
    courts: [_court('court-1', 'Pista 1'), _court('court-2', 'Pista 2')],
    sportId: 'sport-1',
    slotsByCourtId: const {
      'court-1': [
        SlotInfo(scheduledAt: '2030-06-01T18:00:00.000Z', isAvailable: true),
        SlotInfo(scheduledAt: '2030-06-01T19:30:00.000Z', isAvailable: true),
      ],
    },
    selectedCourtId: selectedCourtId,
    selectedSlot: selectedSlot,
    selectedCategoryId: categoryId,
    playerCategoryLabel: categoryId == null ? null : 'Primera',
    maxParticipants: maxParticipants,
    error: error,
    submittedMatchId: submittedMatchId,
  );
}

/// CTA del footer: `FilledButton.icon` crea una subclase, así que se busca
/// por predicado en lugar de `find.byType`.
final _ctaFinder = find.byWidgetPredicate((w) => w is FilledButton);

//? Issue #116: venue_booking_form.dart solo se renderizaba a través de los
//? goldens de VenueBookingScreen. Estos tests cubren sus estados principales y
//? las interacciones (fecha, cancha, horario, stepper, envío y feedback).
void main() {
  late _MockVenueBookingCubit cubit;
  late List<String> createdIds;

  setUp(() async {
    //? Sin ExchangeRatesRepository registrado, las tasas caen a lista vacía.
    await getIt.reset();
    cubit = _MockVenueBookingCubit();
    createdIds = [];
  });

  tearDown(() async {
    await getIt.reset();
  });

  Future<void> pumpForm(
    WidgetTester tester, {
    required VenueBookingState state,
    Stream<VenueBookingState>? stream,
  }) async {
    when(() => cubit.state).thenReturn(state);
    whenListen(
      cubit,
      stream ?? const Stream<VenueBookingState>.empty(),
      initialState: state,
    );
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BlocProvider<VenueBookingCubit>.value(
            value: cubit,
            child: VenueBookingForm(now: _now, onMatchCreated: createdIds.add),
          ),
        ),
      ),
    );
    await tester.pump();
  }

  testWidgets('should show only a progress indicator when loading', (
    tester,
  ) async {
    await pumpForm(tester, state: _state(loading: true));

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.text('Pista 1'), findsNothing);
    expect(_ctaFinder, findsNothing);
  });

  testWidgets('should render sections, courts and disabled CTA when loaded', (
    tester,
  ) async {
    await pumpForm(tester, state: _state());

    expect(find.textContaining('CUÁNDO'), findsOneWidget);
    expect(find.textContaining('CANCHA Y HORARIO'), findsOneWidget);
    expect(find.text('Pista 1'), findsOneWidget);
    expect(find.text('Pista 2'), findsOneWidget);
    expect(find.text('Hoy'), findsOneWidget);
    expect(find.text('Primera'), findsOneWidget);
    expect(find.text('Elige cancha y horario'), findsOneWidget);
    final button = tester.widget<FilledButton>(_ctaFinder);
    expect(button.onPressed, isNull);
  });

  testWidgets('should align the CUÁNDO header with the other section headers', (
    tester,
  ) async {
    await pumpForm(tester, state: _state());

    final whenLeft = tester.getTopLeft(find.textContaining('CUÁNDO')).dx;
    final courtLeft = tester
        .getTopLeft(find.textContaining('CANCHA Y HORARIO'))
        .dx;
    expect(whenLeft, courtLeft);
  });

  testWidgets(
    'should call selectDate with the tapped day when a day is tapped',
    (tester) async {
      await pumpForm(tester, state: _state());

      //? El primer domingo de la tira es el 2 de junio de 2030.
      await tester.tap(find.text('DOM').first);

      verify(() => cubit.selectDate(DateTime(2030, 6, 2))).called(1);
    },
  );

  testWidgets('should call selectCourt when a court row is tapped', (
    tester,
  ) async {
    await pumpForm(tester, state: _state());

    await tester.tap(find.text('Pista 2'));

    verify(() => cubit.selectCourt('court-2')).called(1);
  });

  testWidgets('should call selectSlot when an available slot is tapped', (
    tester,
  ) async {
    await pumpForm(tester, state: _state(selectedCourtId: 'court-1'));

    await tester.tap(find.text('19:30 - 21:00'));

    verify(() => cubit.selectSlot('2030-06-01T19:30:00.000Z')).called(1);
  });

  testWidgets('should call setMaxParticipants with +1 and -1 on the stepper', (
    tester,
  ) async {
    await pumpForm(tester, state: _state(maxParticipants: 4));

    await tester.ensureVisible(find.byIcon(AppIcons.add));
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(AppIcons.add));
    await tester.tap(find.byIcon(AppIcons.remove));

    verify(() => cubit.setMaxParticipants(5)).called(1);
    verify(() => cubit.setMaxParticipants(3)).called(1);
  });

  testWidgets('should not call setMaxParticipants when the stepper is at max', (
    tester,
  ) async {
    await pumpForm(tester, state: _state(maxParticipants: 8));

    await tester.ensureVisible(find.byIcon(AppIcons.add));
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(AppIcons.add));

    verifyNever(() => cubit.setMaxParticipants(any()));
  });

  testWidgets('should call setGender when a gender option is tapped', (
    tester,
  ) async {
    await pumpForm(tester, state: _state());

    await tester.ensureVisible(find.text('Mixto'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Mixto'));

    verify(() => cubit.setGender('MIXED')).called(1);
  });

  testWidgets('should show the missing-category notice and keep CTA disabled '
      'when the player has no category', (tester) async {
    await pumpForm(
      tester,
      state: _state(
        categoryId: null,
        selectedCourtId: 'court-1',
        selectedSlot: '2030-06-01T18:00:00.000Z',
      ),
    );

    expect(
      find.text('Necesitás una categoría en este deporte para crear partidas.'),
      findsOneWidget,
    );
    final button = tester.widget<FilledButton>(_ctaFinder);
    expect(button.onPressed, isNull);
  });

  testWidgets('should show the summary and call submit when ready', (
    tester,
  ) async {
    when(() => cubit.submit()).thenAnswer((_) async {});
    await pumpForm(
      tester,
      state: _state(
        selectedCourtId: 'court-1',
        selectedSlot: '2030-06-01T18:00:00.000Z',
      ),
    );

    expect(
      find.text('Club Cuádrala · Pista 1 · 18:00 - 19:30'),
      findsOneWidget,
    );
    await tester.tap(find.text('Crear partida'));

    verify(() => cubit.submit()).called(1);
  });

  testWidgets('should show a snackbar when the cubit emits an error', (
    tester,
  ) async {
    final controller = StreamController<VenueBookingState>();
    await pumpForm(tester, state: _state(), stream: controller.stream);

    final failed = _state(error: 'La cancha ya está ocupada.');
    when(() => cubit.state).thenReturn(failed);
    controller.add(failed);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 750));

    expect(find.text('La cancha ya está ocupada.'), findsOneWidget);
    expect(createdIds, isEmpty);
    await controller.close();
  });

  testWidgets('should call onMatchCreated when the cubit emits a match id', (
    tester,
  ) async {
    final controller = StreamController<VenueBookingState>();
    await pumpForm(tester, state: _state(), stream: controller.stream);

    final created = _state(submittedMatchId: 'match-42');
    when(() => cubit.state).thenReturn(created);
    controller.add(created);
    await tester.pump();

    expect(createdIds, ['match-42']);
    expect(find.byType(SnackBar), findsNothing);
    await controller.close();
  });
}
