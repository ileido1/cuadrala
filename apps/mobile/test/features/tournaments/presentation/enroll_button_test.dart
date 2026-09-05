import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_registration_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/enroll_button.dart';

class _MockRegistrationsCubit extends MockCubit<TournamentRegistrationsState>
    implements TournamentRegistrationsCubit {}

const _userId = 'user-1';

TournamentRegistrationDto _registration(String status) => TournamentRegistrationDto(
      id: 'reg-1',
      tournamentId: 't-1',
      userId: _userId,
      status: status,
      createdAt: DateTime(2024),
    );

void main() {
  late _MockRegistrationsCubit cubit;

  setUp(() {
    cubit = _MockRegistrationsCubit();
    when(() => cubit.currentUserId).thenReturn(_userId);
  });

  Future<void> pump(
    WidgetTester tester, {
    required String tournamentStatus,
    List<TournamentRegistrationDto> items = const [],
  }) async {
    final state = TournamentRegistrationsLoaded(
      items: items,
      total: items.length,
      invitations: const [],
    );
    when(() => cubit.state).thenReturn(state);
    when(() => cubit.stream).thenAnswer((_) => Stream.value(state));
    when(() => cubit.isCurrentUserRegistered)
        .thenReturn(state.isUserRegistered(_userId));

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BlocProvider<TournamentRegistrationsCubit>.value(
            value: cubit,
            child: EnrollButton(tournamentStatus: tournamentStatus),
          ),
        ),
      ),
    );
    await tester.pump();
  }

  group('EnrollButton', () {
    //? El bug: el boton no miraba el estado del torneo, se mostraba siempre, y
    //? en IN_PROGRESS la API contestaba 409 TORNEO_CERRADO. Ofrecer una accion
    //? imposible se lee como app rota, no como torneo cerrado.
    testWidgets('should offer to join while the roster is open', (tester) async {
      await pump(tester, tournamentStatus: 'OPEN');

      expect(find.text('Inscribirme'), findsOneWidget);
    });

    testWidgets('should not offer to join once the tournament started',
        (tester) async {
      await pump(tester, tournamentStatus: 'IN_PROGRESS');

      expect(find.text('Inscribirme'), findsNothing);
      expect(find.text('Inscripciones cerradas'), findsOneWidget);
    });

    //? Anotado no es aceptado: el cuadro se arma solo con los CONFIRMED, asi
    //? que un PENDING que cree estar adentro se entera al no aparecer.
    testWidgets('should say the registration is awaiting approval when PENDING',
        (tester) async {
      await pump(
        tester,
        tournamentStatus: 'OPEN',
        items: [_registration('PENDING')],
      );

      expect(find.text('Falta que te acepten'), findsOneWidget);
      expect(find.text('Inscribirme'), findsNothing);
    });

    testWidgets('should confirm the user is in when CONFIRMED', (tester) async {
      await pump(
        tester,
        tournamentStatus: 'OPEN',
        items: [_registration('CONFIRMED')],
      );

      expect(find.text('Estás dentro'), findsOneWidget);
    });

    testWidgets('should let a registered user leave while the roster is open',
        (tester) async {
      await pump(
        tester,
        tournamentStatus: 'OPEN',
        items: [_registration('CONFIRMED')],
      );

      expect(find.byKey(const Key('tournament.withdrawButton')), findsOneWidget);
    });

    //? La API rechaza la baja fuera de DRAFT/OPEN, asi que el boton tampoco va.
    testWidgets('should hide the leave action once the tournament started',
        (tester) async {
      await pump(
        tester,
        tournamentStatus: 'IN_PROGRESS',
        items: [_registration('CONFIRMED')],
      );

      expect(find.byKey(const Key('tournament.withdrawButton')), findsNothing);
      expect(find.text('Estás dentro'), findsOneWidget);
    });
  });
}
