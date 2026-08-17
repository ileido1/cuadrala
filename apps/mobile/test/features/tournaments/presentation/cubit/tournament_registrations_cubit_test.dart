import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_invitation_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_registration_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_state.dart';

class _MockTournamentsRepository extends Mock implements TournamentsRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

UserMeDto _me({String id = 'user-1'}) => UserMeDto(
      id: id,
      email: 'user@test.com',
      name: 'Usuario Test',
      subscriptionType: 'FREE',
    );

TournamentRegistrationDto _registration({
  String id = 'reg-1',
  String userId = 'user-2',
  String status = 'CONFIRMED',
}) =>
    TournamentRegistrationDto(
      id: id,
      tournamentId: 't-1',
      userId: userId,
      status: status,
      createdAt: DateTime(2024),
    );

TournamentInvitationDto _invitation({
  String id = 'inv-1',
  String invitedUserId = 'user-1',
  String status = 'PENDING',
}) =>
    TournamentInvitationDto(
      id: id,
      tournamentId: 't-1',
      invitedUserId: invitedUserId,
      createdByUserId: 'organizer-1',
      status: status,
      createdAt: DateTime(2024),
    );

void main() {
  group('TournamentRegistrationsCubit', () {
    late _MockTournamentsRepository tournamentsRepository;
    late _MockProfileRepository profileRepository;

    const tournamentId = 't-1';

    setUp(() {
      tournamentsRepository = _MockTournamentsRepository();
      profileRepository = _MockProfileRepository();
      when(() => profileRepository.getMe()).thenAnswer((_) async => _me());
    });

    blocTest<TournamentRegistrationsCubit, TournamentRegistrationsState>(
      'load fetches registrations and invitations (organizer path)',
      build: () {
        when(() => tournamentsRepository.listRegistrations(tournamentId: tournamentId))
            .thenAnswer((_) async => [_registration()]);
        when(() => tournamentsRepository.listInvitations(tournamentId: tournamentId))
            .thenAnswer((_) async => [_invitation()]);
        return TournamentRegistrationsCubit(
          tournamentsRepository: tournamentsRepository,
          profileRepository: profileRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const TournamentRegistrationsLoading(),
        isA<TournamentRegistrationsLoaded>()
            .having((s) => s.items.length, 'items.length', 1)
            .having((s) => s.invitations.length, 'invitations.length', 1),
      ],
    );

    blocTest<TournamentRegistrationsCubit, TournamentRegistrationsState>(
      'load degrades gracefully when invitations are 403 (non-organizer)',
      build: () {
        when(() => tournamentsRepository.listRegistrations(tournamentId: tournamentId))
            .thenAnswer((_) async => [_registration()]);
        when(() => tournamentsRepository.listInvitations(tournamentId: tournamentId))
            .thenThrow(const AppFailure(code: 'NO_AUTORIZADO', message: 'No autorizado.'));
        return TournamentRegistrationsCubit(
          tournamentsRepository: tournamentsRepository,
          profileRepository: profileRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const TournamentRegistrationsLoading(),
        isA<TournamentRegistrationsLoaded>()
            .having((s) => s.items.length, 'items.length', 1)
            .having((s) => s.invitations.length, 'invitations.length', 0),
      ],
    );

    blocTest<TournamentRegistrationsCubit, TournamentRegistrationsState>(
      'acceptInvitation refreshes registrations and invitations on success',
      build: () {
        when(() => tournamentsRepository.listRegistrations(tournamentId: tournamentId))
            .thenAnswer((_) async => [_registration(status: 'CONFIRMED', userId: 'user-1')]);
        when(() => tournamentsRepository.listInvitations(tournamentId: tournamentId))
            .thenAnswer((_) async => <TournamentInvitationDto>[]);
        when(() => tournamentsRepository.respondToInvitation(
              tournamentId: tournamentId,
              invitationId: 'inv-1',
              accept: true,
            )).thenAnswer((_) async => _invitation(status: 'ACCEPTED'));
        return TournamentRegistrationsCubit(
          tournamentsRepository: tournamentsRepository,
          profileRepository: profileRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.acceptInvitation('inv-1');
      },
      skip: 2,
      expect: () => [
        isA<TournamentRegistrationsLoaded>().having((s) => s.responding, 'responding', true),
        isA<TournamentRegistrationsLoaded>().having((s) => s.responding, 'responding', false),
      ],
      verify: (_) {
        verify(() => tournamentsRepository.respondToInvitation(
              tournamentId: tournamentId,
              invitationId: 'inv-1',
              accept: true,
            )).called(1);
      },
    );

    blocTest<TournamentRegistrationsCubit, TournamentRegistrationsState>(
      'rejectInvitation calls repository with accept=false',
      build: () {
        when(() => tournamentsRepository.listRegistrations(tournamentId: tournamentId))
            .thenAnswer((_) async => <TournamentRegistrationDto>[]);
        when(() => tournamentsRepository.listInvitations(tournamentId: tournamentId))
            .thenAnswer((_) async => <TournamentInvitationDto>[]);
        when(() => tournamentsRepository.respondToInvitation(
              tournamentId: tournamentId,
              invitationId: 'inv-1',
              accept: false,
            )).thenAnswer((_) async => _invitation(status: 'REJECTED'));
        return TournamentRegistrationsCubit(
          tournamentsRepository: tournamentsRepository,
          profileRepository: profileRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.rejectInvitation('inv-1');
      },
      skip: 2,
      expect: () => [
        isA<TournamentRegistrationsLoaded>().having((s) => s.responding, 'responding', true),
        isA<TournamentRegistrationsLoaded>().having((s) => s.responding, 'responding', false),
      ],
      verify: (_) {
        verify(() => tournamentsRepository.respondToInvitation(
              tournamentId: tournamentId,
              invitationId: 'inv-1',
              accept: false,
            )).called(1);
      },
    );

    blocTest<TournamentRegistrationsCubit, TournamentRegistrationsState>(
      'invite calls repository and refreshes invitations',
      build: () {
        when(() => tournamentsRepository.listRegistrations(tournamentId: tournamentId))
            .thenAnswer((_) async => <TournamentRegistrationDto>[]);
        when(() => tournamentsRepository.listInvitations(tournamentId: tournamentId))
            .thenAnswer((_) async => <TournamentInvitationDto>[]);
        when(() => tournamentsRepository.inviteParticipant(
              tournamentId: tournamentId,
              userId: 'user-9',
            )).thenAnswer((_) async => _invitation(id: 'inv-9', invitedUserId: 'user-9'));
        return TournamentRegistrationsCubit(
          tournamentsRepository: tournamentsRepository,
          profileRepository: profileRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.invite('user-9');
      },
      skip: 2,
      expect: () => [
        isA<TournamentRegistrationsLoaded>().having((s) => s.inviting, 'inviting', true),
        isA<TournamentRegistrationsLoaded>().having((s) => s.inviting, 'inviting', false),
      ],
      verify: (_) {
        verify(() => tournamentsRepository.inviteParticipant(
              tournamentId: tournamentId,
              userId: 'user-9',
            )).called(1);
      },
    );

    blocTest<TournamentRegistrationsCubit, TournamentRegistrationsState>(
      'cancelInvitation calls repository and refreshes invitations',
      build: () {
        when(() => tournamentsRepository.listRegistrations(tournamentId: tournamentId))
            .thenAnswer((_) async => <TournamentRegistrationDto>[]);
        when(() => tournamentsRepository.listInvitations(tournamentId: tournamentId))
            .thenAnswer((_) async => [_invitation(id: 'inv-1')]);
        when(() => tournamentsRepository.cancelInvitation(
              tournamentId: tournamentId,
              invitationId: 'inv-1',
            )).thenAnswer((_) async {});
        return TournamentRegistrationsCubit(
          tournamentsRepository: tournamentsRepository,
          profileRepository: profileRepository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.cancelInvitation('inv-1');
      },
      skip: 2,
      expect: () => [
        isA<TournamentRegistrationsLoaded>().having((s) => s.inviting, 'inviting', true),
        isA<TournamentRegistrationsLoaded>().having((s) => s.inviting, 'inviting', false),
      ],
      verify: (_) {
        verify(() => tournamentsRepository.cancelInvitation(
              tournamentId: tournamentId,
              invitationId: 'inv-1',
            )).called(1);
      },
    );
  });
}
