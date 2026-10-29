import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/data/models/tournament_invite_link_dto.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/data/tournament_invite_link_repository.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/presentation/cubit/tournament_invite_links_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/presentation/cubit/tournament_invite_links_state.dart';

class _MockTournamentInviteLinkRepository extends Mock
    implements TournamentInviteLinkRepository {}

TournamentInviteLinkDto _link({
  String id = 'link-1',
  String? token,
  int? usesCount,
}) =>
    TournamentInviteLinkDto(
      id: id,
      expiresAt: DateTime(2026, 2, 1),
      maxUses: null,
      usesCount: usesCount ?? 0,
      revokedAt: null,
      createdAt: DateTime(2026, 1, 15),
      createdByUserId: 'organizer-1',
      token: token,
      url: token != null ? 'https://cuadrala.app/invite/$token' : null,
      deepLink: token != null ? 'https://cuadrala.app/invite/$token' : null,
    );

void main() {
  group('TournamentInviteLinksCubit', () {
    late _MockTournamentInviteLinkRepository repository;

    const tournamentId = 't-1';

    setUp(() {
      repository = _MockTournamentInviteLinkRepository();
    });

    tearDown(() {
      reset(repository);
    });

    blocTest<TournamentInviteLinksCubit, TournamentInviteLinksState>(
      'load fetches the tournament links',
      build: () {
        when(() => repository.list(tournamentId: tournamentId))
            .thenAnswer((_) async => [_link()]);
        return TournamentInviteLinksCubit(
          tournamentInviteLinkRepository: repository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const TournamentInviteLinksLoading(),
        isA<TournamentInviteLinksLoaded>()
            .having((s) => s.links.length, 'links.length', 1),
      ],
    );

    blocTest<TournamentInviteLinksCubit, TournamentInviteLinksState>(
      'load emits a failure with the backend message on error',
      build: () {
        when(() => repository.list(tournamentId: tournamentId)).thenThrow(
          const AppFailure(code: 'NO_AUTORIZADO', message: 'No autorizado.'),
        );
        return TournamentInviteLinksCubit(
          tournamentInviteLinkRepository: repository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const TournamentInviteLinksLoading(),
        const TournamentInviteLinksFailure(message: 'No autorizado.'),
      ],
    );

    blocTest<TournamentInviteLinksCubit, TournamentInviteLinksState>(
      'generate creates a link, refreshes the list and keeps the raw token for sharing',
      build: () {
        when(() => repository.list(tournamentId: tournamentId))
            .thenAnswer((_) async => [_link()]);
        when(
          () => repository.generate(
            tournamentId: tournamentId,
            expiresAt: any(named: 'expiresAt'),
            maxUses: any(named: 'maxUses'),
          ),
        ).thenAnswer((_) async => _link(id: 'link-2', token: 'raw-token'));
        return TournamentInviteLinksCubit(
          tournamentInviteLinkRepository: repository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.generate();
      },
      skip: 2,
      expect: () => [
        isA<TournamentInviteLinksLoaded>()
            .having((s) => s.generating, 'generating', true),
        isA<TournamentInviteLinksLoaded>()
            .having((s) => s.generating, 'generating', false)
            .having(
              (s) => s.lastGeneratedLink?.token,
              'lastGeneratedLink.token',
              'raw-token',
            ),
      ],
    );

    blocTest<TournamentInviteLinksCubit, TournamentInviteLinksState>(
      'generate surfaces a 422 range error without touching the list',
      build: () {
        when(() => repository.list(tournamentId: tournamentId))
            .thenAnswer((_) async => [_link()]);
        when(
          () => repository.generate(
            tournamentId: tournamentId,
            expiresAt: any(named: 'expiresAt'),
            maxUses: any(named: 'maxUses'),
          ),
        ).thenThrow(
          const AppFailure(code: 'HTTP_422', message: 'Rango inválido.'),
        );
        return TournamentInviteLinksCubit(
          tournamentInviteLinkRepository: repository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.generate();
      },
      skip: 2,
      expect: () => [
        isA<TournamentInviteLinksLoaded>()
            .having((s) => s.generating, 'generating', true),
        isA<TournamentInviteLinksLoaded>()
            .having((s) => s.generating, 'generating', false)
            .having((s) => s.generateError, 'generateError', 'Rango inválido.'),
      ],
    );

    blocTest<TournamentInviteLinksCubit, TournamentInviteLinksState>(
      'revoke removes the link from the refreshed list',
      build: () {
        when(() => repository.list(tournamentId: tournamentId))
            .thenAnswer((_) async => [_link()]);
        when(
          () => repository.revoke(tournamentId: tournamentId, linkId: 'link-1'),
        ).thenAnswer((_) async {
          when(() => repository.list(tournamentId: tournamentId))
              .thenAnswer((_) async => <TournamentInviteLinkDto>[]);
        });
        return TournamentInviteLinksCubit(
          tournamentInviteLinkRepository: repository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.revoke('link-1');
      },
      skip: 2,
      expect: () => [
        isA<TournamentInviteLinksLoaded>()
            .having((s) => s.busyLinkId, 'busyLinkId', 'link-1'),
        isA<TournamentInviteLinksLoaded>()
            .having((s) => s.busyLinkId, 'busyLinkId', isNull)
            .having((s) => s.links, 'links', isEmpty),
      ],
    );

    blocTest<TournamentInviteLinksCubit, TournamentInviteLinksState>(
      'revoke surfaces a 403 error without mutating the list',
      build: () {
        when(() => repository.list(tournamentId: tournamentId))
            .thenAnswer((_) async => [_link()]);
        when(
          () => repository.revoke(tournamentId: tournamentId, linkId: 'link-1'),
        ).thenThrow(
          const AppFailure(code: 'NO_AUTORIZADO', message: 'No autorizado.'),
        );
        return TournamentInviteLinksCubit(
          tournamentInviteLinkRepository: repository,
          tournamentId: tournamentId,
        );
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.revoke('link-1');
      },
      skip: 2,
      expect: () => [
        isA<TournamentInviteLinksLoaded>()
            .having((s) => s.busyLinkId, 'busyLinkId', 'link-1'),
        isA<TournamentInviteLinksLoaded>()
            .having((s) => s.busyLinkId, 'busyLinkId', isNull)
            .having((s) => s.revokeError, 'revokeError', 'No autorizado.')
            .having((s) => s.links.length, 'links.length', 1),
      ],
      verify: (_) {
        verify(
          () => repository.revoke(tournamentId: tournamentId, linkId: 'link-1'),
        ).called(1);
      },
    );
  });
}
