import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_invitation_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_registration_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_state.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournament_invitation_screen.dart';

class _Tournaments extends Mock implements TournamentsRepository {}

class _Profile extends Mock implements ProfileRepository {}

void main() {
  setUpAll(() async => initializeDateFormatting('es'));
  final tournament = TournamentListItemDto(
    id: 't-1',
    name: 'Copa Cuádrala',
    status: 'OPEN',
    sportName: 'Pádel',
    categoryId: 'cat-1',
    categoryName: '7ma',
    startsAt: DateTime(2026, 9, 12, 9),
    endsAt: DateTime(2026, 9, 12, 11),
    registrationCount: 8,
    maxSlots: 16,
    venueName: 'Club Cuádrala',
    organizerName: 'Club Cuádrala',
  );

  TournamentInvitationDto respondedInvitation(String status) =>
      TournamentInvitationDto(
        id: 'inv-1',
        tournamentId: 't-1',
        invitedUserId: 'player-1',
        createdByUserId: 'organizer-1',
        status: status,
        createdAt: DateTime(2026, 9, 1),
      );

  TournamentRegistrationDto confirmedRegistration() =>
      TournamentRegistrationDto(
        id: 'reg-1',
        tournamentId: 't-1',
        userId: 'player-1',
        status: 'CONFIRMED',
        createdAt: DateTime(2026, 9, 2),
      );

  Future<TournamentRegistrationsCubit> loadInvitee(
    _Tournaments repository,
    _Profile profile,
  ) async {
    when(() => profile.getMe()).thenAnswer(
      (_) async => const UserMeDto(
        id: 'player-1',
        email: 'player@example.com',
        name: 'Ana',
        subscriptionType: 'FREE',
      ),
    );
    when(
      () => repository.listRegistrations(tournamentId: 't-1'),
    ).thenAnswer((_) async => const []);
    final cubit = TournamentRegistrationsCubit(
      tournamentsRepository: repository,
      profileRepository: profile,
      tournamentId: 't-1',
    );
    await cubit.load(loadInvitationList: false);
    return cubit;
  }

  Widget app(TournamentRegistrationsCubit cubit) => MaterialApp(
    home: BlocProvider.value(
      value: cubit,
      child: TournamentInvitationBody(
        tournament: tournament,
        invitationId: 'inv-1',
      ),
    ),
  );

  test(
    'skips invitation listing without explicit organizer authorization',
    () async {
      final repository = _Tournaments();
      final profile = _Profile();
      final cubit = await loadInvitee(repository, profile);

      expect(cubit.state, isA<TournamentRegistrationsLoaded>());
      expect(
        (cubit.state as TournamentRegistrationsLoaded).canManageInvitations,
        isFalse,
      );
      verifyNever(() => repository.listInvitations(tournamentId: 't-1'));
      await cubit.close();
    },
  );

  testWidgets('acceptance reloads registration and renders CONFIRMED', (
    tester,
  ) async {
    final repository = _Tournaments();
    final profile = _Profile();
    final cubit = await loadInvitee(repository, profile);
    var registrationReads = 0;
    when(
      () => repository.respondToInvitation(
        tournamentId: 't-1',
        invitationId: 'inv-1',
        accept: true,
      ),
    ).thenAnswer((_) async => respondedInvitation('ACCEPTED'));
    when(() => repository.listRegistrations(tournamentId: 't-1')).thenAnswer(
      (_) async => ++registrationReads == 1
          ? [confirmedRegistration()]
          : const <TournamentRegistrationDto>[],
    );

    await tester.pumpWidget(app(cubit));
    await tester.tap(find.text('Aceptar'));
    await tester.pumpAndSettle();

    expect(find.text('Inscripción confirmada'), findsOneWidget);
    expect(find.text('CONFIRMED'), findsNothing);
    expect(find.text('Rechazar'), findsNothing);
    expect(cubit.state, isA<TournamentRegistrationsLoaded>());
    expect(
      (cubit.state as TournamentRegistrationsLoaded)
          .registrationFor('player-1')
          ?.status,
      'CONFIRMED',
    );
    verifyNever(() => repository.listInvitations(tournamentId: 't-1'));
    await cubit.close();
  });

  testWidgets('response failure stays on screen and allows retry', (
    tester,
  ) async {
    final repository = _Tournaments();
    final profile = _Profile();
    final cubit = await loadInvitee(repository, profile);
    when(
      () => repository.respondToInvitation(
        tournamentId: 't-1',
        invitationId: 'inv-1',
        accept: false,
      ),
    ).thenThrow(Exception('offline'));

    await tester.pumpWidget(app(cubit));
    await tester.tap(find.text('Rechazar'));
    await tester.pumpAndSettle();

    expect(find.text('No se pudo responder la invitación.'), findsOneWidget);
    expect(find.text('Rechazar'), findsOneWidget);
    await cubit.close();
  });
}
