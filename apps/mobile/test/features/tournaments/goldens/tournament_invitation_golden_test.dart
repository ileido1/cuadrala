import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_invitation_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_registration_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_registrations_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournament_invitation_screen.dart';

import 'tournament_golden.dart';

class _Tournaments extends Mock implements TournamentsRepository {}

class _Profile extends Mock implements ProfileRepository {}

void main() {
  setUpAll(loadTournamentGoldenFonts);
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

  testWidgets('renders pending invitation in both themes', (tester) async {
    for (final brightness in Brightness.values) {
      final repository = _Tournaments();
      final profile = _Profile();
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
      ).thenAnswer((_) async => const <TournamentRegistrationDto>[]);
      final cubit = TournamentRegistrationsCubit(
        tournamentsRepository: repository,
        profileRepository: profile,
        tournamentId: 't-1',
      );
      await cubit.load(loadInvitationList: false);

      await pumpTournamentGolden(
        tester,
        brightness: brightness,
        child: BlocProvider.value(
          value: cubit,
          child: TournamentInvitationBody(
            key: ValueKey(brightness),
            tournament: tournament,
            invitationId: 'inv-1',
          ),
        ),
      );
      expect(tester.takeException(), isNull);
      await expectLater(
        find.byKey(tournamentGoldenKey),
        matchesGoldenFile('invitation_pending_${brightness.name}.png'),
      );
      await cubit.close();
    }
  });

  testWidgets(
    'renders accepted invitation after confirmed registration refresh',
    (tester) async {
      for (final brightness in Brightness.values) {
        final repository = _Tournaments();
        final profile = _Profile();
        when(() => profile.getMe()).thenAnswer(
          (_) async => const UserMeDto(
            id: 'player-1',
            email: 'player@example.com',
            name: 'Ana',
            subscriptionType: 'FREE',
          ),
        );
        var reads = 0;
        when(
          () => repository.listRegistrations(tournamentId: 't-1'),
        ).thenAnswer((_) async {
          reads++;
          return reads == 1
              ? const <TournamentRegistrationDto>[]
              : [
                  TournamentRegistrationDto(
                    id: 'reg-1',
                    tournamentId: 't-1',
                    userId: 'player-1',
                    status: 'CONFIRMED',
                    createdAt: DateTime(2026, 9, 12),
                  ),
                ];
        });
        when(
          () => repository.respondToInvitation(
            tournamentId: 't-1',
            invitationId: 'inv-1',
            accept: true,
          ),
        ).thenAnswer(
          (_) async => TournamentInvitationDto(
            id: 'inv-1',
            tournamentId: 't-1',
            invitedUserId: 'player-1',
            createdByUserId: 'organizer-1',
            status: 'ACCEPTED',
            createdAt: DateTime(2026, 9, 1),
          ),
        );
        final cubit = TournamentRegistrationsCubit(
          tournamentsRepository: repository,
          profileRepository: profile,
          tournamentId: 't-1',
        );
        await cubit.load(loadInvitationList: false);

        await pumpTournamentGolden(
          tester,
          brightness: brightness,
          child: BlocProvider.value(
            value: cubit,
            child: TournamentInvitationBody(
              key: ValueKey(brightness),
              tournament: tournament,
              invitationId: 'inv-1',
            ),
          ),
        );
        await tester.tap(find.text('Aceptar'));
        await tester.pumpAndSettle();
        expect(find.text('Inscripción confirmada'), findsOneWidget);
        await expectLater(
          find.byKey(tournamentGoldenKey),
          matchesGoldenFile('invitation_accepted_${brightness.name}.png'),
        );
        await cubit.close();
      }
    },
  );
}
