import 'dart:async';
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

  for (final brightness in Brightness.values) {
    for (final scenario in [
      'loading',
      'error',
      'responding',
      'response_error',
      'rejected',
      'missing_optionals',
    ]) {
      testWidgets('invitation $scenario ${brightness.name}', (tester) async {
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
        ).thenAnswer((_) {
          if (scenario == 'loading') {
            return Completer<List<TournamentRegistrationDto>>().future;
          }
          if (scenario == 'error') throw Exception('offline');
          return Future.value(<TournamentRegistrationDto>[]);
        });
        when(
          () => repository.respondToInvitation(
            tournamentId: 't-1',
            invitationId: 'inv-1',
            accept: any(named: 'accept'),
          ),
        ).thenAnswer((_) {
          if (scenario == 'responding') {
            return Completer<TournamentInvitationDto>().future;
          }
          if (scenario == 'response_error') throw Exception('offline');
          return Future.value(
            TournamentInvitationDto(
              id: 'inv-1',
              tournamentId: 't-1',
              invitedUserId: 'player-1',
              createdByUserId: 'org',
              status: 'REJECTED',
              createdAt: DateTime(2026, 9, 1),
            ),
          );
        });
        final cubit = TournamentRegistrationsCubit(
          tournamentsRepository: repository,
          profileRepository: profile,
          tournamentId: 't-1',
        );
        final loading = cubit.load(loadInvitationList: false);
        if (scenario != 'loading') await loading;
        addTearDown(cubit.close);
        await pumpTournamentGolden(
          tester,
          brightness: brightness,
          child: BlocProvider.value(
            value: cubit,
            child: TournamentInvitationBody(
              tournament: scenario == 'missing_optionals'
                  ? const TournamentListItemDto(
                      id: 't-1',
                      name: 'Copa sin sede',
                      sportName: 'Pádel',
                      categoryName: '7ma',
                      categoryId: 'cat',
                      status: 'OPEN',
                      startsAt: null,
                      registrationCount: 0,
                    )
                  : tournament,
              invitationId: 'inv-1',
            ),
          ),
        );
        await tester.pump(const Duration(milliseconds: 300));
        if (['responding', 'response_error', 'rejected'].contains(scenario)) {
          await tester.tap(
            find.text(scenario == 'rejected' ? 'Rechazar' : 'Aceptar'),
          );
          await tester.pump(const Duration(milliseconds: 300));
        }
        if (scenario == 'loading' || scenario == 'responding') {
          expect(find.byType(CircularProgressIndicator), findsOneWidget);
          expect(
            tester
                .widget<FilledButton>(find.bySubtype<FilledButton>())
                .onPressed,
            isNull,
          );
        } else if (scenario == 'error') {
          expect(find.text('Volver a cargar'), findsOneWidget);
        } else if (scenario == 'rejected') {
          expect(find.text('Invitación rechazada'), findsOneWidget);
          expect(find.text('Aceptar'), findsNothing);
        } else if (scenario == 'response_error') {
          expect(
            find.text('No se pudo responder la invitación.'),
            findsOneWidget,
          );
        } else {
          expect(find.text('Copa sin sede'), findsOneWidget);
          expect(find.text('Club Cuádrala'), findsNothing);
        }
        expect(tester.takeException(), isNull);
        await expectLater(
          find.byKey(tournamentGoldenKey),
          matchesGoldenFile('invitation_${scenario}_${brightness.name}.png'),
        );
      });
    }
  }

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
