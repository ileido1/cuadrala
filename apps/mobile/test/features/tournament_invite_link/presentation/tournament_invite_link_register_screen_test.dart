import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/tournament_invite_link/data/models/tournament_invite_link_dto.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/presentation/cubit/tournament_invite_link_register_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/presentation/cubit/tournament_invite_link_register_state.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/presentation/tournament_invite_link_register_screen.dart';

class _MockTournamentInviteLinkRegisterCubit
    extends MockCubit<TournamentInviteLinkRegisterState>
    implements TournamentInviteLinkRegisterCubit {}

TournamentInviteLinkPreviewDto _preview({bool acceptsRegistration = true}) =>
    TournamentInviteLinkPreviewDto(
      tournamentId: 't-1',
      tournamentName: 'Copa Cuadrala',
      sportName: 'Pádel',
      categoryName: 'Mixto',
      venueName: 'Club X',
      startsAt: DateTime(2026, 3, 1),
      status: 'OPEN',
      acceptsRegistration: acceptsRegistration,
    );

Widget _buildTestApp(TournamentInviteLinkRegisterCubit cubit) {
  return MaterialApp(
    home: BlocProvider<TournamentInviteLinkRegisterCubit>.value(
      value: cubit,
      child: const TournamentInviteLinkRegisterBody(),
    ),
  );
}

void main() {
  late _MockTournamentInviteLinkRegisterCubit cubit;

  setUp(() {
    cubit = _MockTournamentInviteLinkRegisterCubit();
  });

  testWidgets('shows a loading indicator while the preview loads', (
    tester,
  ) async {
    when(
      () => cubit.state,
    ).thenReturn(const TournamentInviteLinkRegisterLoadingPreview());

    await tester.pumpWidget(_buildTestApp(cubit));

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('shows a specific message for an expired link', (tester) async {
    when(() => cubit.state).thenReturn(
      const TournamentInviteLinkRegisterInvalid(
        reason: 'EXPIRED',
        message: 'Este link venció.',
      ),
    );

    await tester.pumpWidget(_buildTestApp(cubit));

    expect(
      find.byKey(const Key('tournamentInviteLinkRegister.invalid.EXPIRED')),
      findsOneWidget,
    );
    expect(find.text('Este link venció.'), findsOneWidget);
  });

  testWidgets('shows a specific message for a revoked link', (tester) async {
    when(() => cubit.state).thenReturn(
      const TournamentInviteLinkRegisterInvalid(
        reason: 'REVOKED',
        message: 'Este link fue revocado.',
      ),
    );

    await tester.pumpWidget(_buildTestApp(cubit));

    expect(
      find.byKey(const Key('tournamentInviteLinkRegister.invalid.REVOKED')),
      findsOneWidget,
    );
  });

  testWidgets('shows a specific message for an exhausted link', (
    tester,
  ) async {
    when(() => cubit.state).thenReturn(
      const TournamentInviteLinkRegisterInvalid(
        reason: 'EXHAUSTED',
        message: 'Se agotaron los cupos del link.',
      ),
    );

    await tester.pumpWidget(_buildTestApp(cubit));

    expect(
      find.byKey(const Key('tournamentInviteLinkRegister.invalid.EXHAUSTED')),
      findsOneWidget,
    );
  });

  testWidgets('shows a specific message when the tournament is closed', (
    tester,
  ) async {
    when(() => cubit.state).thenReturn(
      TournamentInviteLinkRegisterPreviewLoaded(
        preview: _preview(acceptsRegistration: false),
      ),
    );

    await tester.pumpWidget(_buildTestApp(cubit));

    expect(
      find.byKey(const Key('tournamentInviteLinkRegister.invalid.CLOSED')),
      findsOneWidget,
    );
  });

  testWidgets('authenticated caller sees a confirm action, no guest form', (
    tester,
  ) async {
    when(() => cubit.state).thenReturn(
      TournamentInviteLinkRegisterPreviewLoaded(
        preview: _preview(),
        isAuthenticated: true,
      ),
    );

    await tester.pumpWidget(_buildTestApp(cubit));

    expect(
      find.byKey(const Key('tournamentInviteLinkRegister.confirmButton')),
      findsOneWidget,
    );
    expect(
      find.byKey(const Key('tournamentInviteLinkRegister.name')),
      findsNothing,
    );
  });

  testWidgets('guest caller sees the guest form, no confirm action', (
    tester,
  ) async {
    when(() => cubit.state).thenReturn(
      TournamentInviteLinkRegisterPreviewLoaded(
        preview: _preview(),
        isAuthenticated: false,
      ),
    );

    await tester.pumpWidget(_buildTestApp(cubit));

    expect(
      find.byKey(const Key('tournamentInviteLinkRegister.name')),
      findsOneWidget,
    );
    expect(
      find.byKey(const Key('tournamentInviteLinkRegister.confirmButton')),
      findsNothing,
    );
  });

  testWidgets('confirm action calls cubit.register() with no guest data', (
    tester,
  ) async {
    when(() => cubit.state).thenReturn(
      TournamentInviteLinkRegisterPreviewLoaded(
        preview: _preview(),
        isAuthenticated: true,
      ),
    );
    when(() => cubit.register()).thenAnswer((_) async {});

    await tester.pumpWidget(_buildTestApp(cubit));
    await tester.tap(
      find.byKey(const Key('tournamentInviteLinkRegister.confirmButton')),
    );
    await tester.pump();

    verify(() => cubit.register()).called(1);
  });

  testWidgets('guest submit calls cubit.register with name/phone/email', (
    tester,
  ) async {
    when(() => cubit.state).thenReturn(
      TournamentInviteLinkRegisterPreviewLoaded(
        preview: _preview(),
        isAuthenticated: false,
      ),
    );
    when(
      () => cubit.register(
        name: any(named: 'name'),
        phone: any(named: 'phone'),
        email: any(named: 'email'),
      ),
    ).thenAnswer((_) async {});

    await tester.pumpWidget(_buildTestApp(cubit));
    await tester.enterText(
      find.byKey(const Key('tournamentInviteLinkRegister.name')),
      'Juan Pérez',
    );
    await tester.enterText(
      find.byKey(const Key('tournamentInviteLinkRegister.email')),
      'juan@mail.com',
    );
    await tester.tap(
      find.byKey(const Key('tournamentInviteLinkRegister.submit')),
    );
    await tester.pump();

    verify(
      () => cubit.register(name: 'Juan Pérez', phone: null, email: 'juan@mail.com'),
    ).called(1);
  });

  testWidgets('shows a confirmation once registered', (tester) async {
    when(() => cubit.state).thenReturn(
      TournamentInviteLinkRegisterPreviewLoaded(
        preview: _preview(),
        isAuthenticated: true,
        result: const TournamentInviteLinkRegistrationResultDto(
          registrationId: 'reg-1',
          registrationType: 'AUTHENTICATED',
          tournamentId: 't-1',
          status: 'PENDING',
        ),
      ),
    );

    await tester.pumpWidget(_buildTestApp(cubit));

    expect(
      find.byKey(const Key('tournamentInviteLinkRegister.success')),
      findsOneWidget,
    );
  });
}
