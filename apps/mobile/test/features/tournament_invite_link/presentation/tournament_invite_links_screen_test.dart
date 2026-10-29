import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/tournament_invite_link/data/models/tournament_invite_link_dto.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/presentation/cubit/tournament_invite_links_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/presentation/cubit/tournament_invite_links_state.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/presentation/tournament_invite_links_screen.dart';

class _MockTournamentInviteLinksCubit
    extends MockCubit<TournamentInviteLinksState>
    implements TournamentInviteLinksCubit {}

TournamentInviteLinkRegistrantDto _registrant({
  String id = 'reg-1',
  String type = 'GUEST',
  String displayName = 'Juan Pérez',
}) => TournamentInviteLinkRegistrantDto(
  registrationId: id,
  type: type,
  displayName: displayName,
  registeredAt: DateTime(2026, 1, 10),
);

TournamentInviteLinkDto _link({
  String id = 'link-1',
  DateTime? revokedAt,
  List<TournamentInviteLinkRegistrantDto> registrants = const [],
}) => TournamentInviteLinkDto(
  id: id,
  expiresAt: DateTime(2026, 3, 1),
  maxUses: null,
  usesCount: registrants.length,
  revokedAt: revokedAt,
  createdAt: DateTime(2026, 1, 1),
  registrants: registrants,
);

Widget _buildTestApp(TournamentInviteLinksCubit cubit) {
  return MaterialApp(
    home: BlocProvider<TournamentInviteLinksCubit>.value(
      value: cubit,
      child: const TournamentInviteLinksBody(),
    ),
  );
}

void main() {
  late _MockTournamentInviteLinksCubit cubit;

  setUp(() {
    cubit = _MockTournamentInviteLinksCubit();
  });

  testWidgets('shows a loading indicator while loading', (tester) async {
    when(() => cubit.state).thenReturn(const TournamentInviteLinksLoading());

    await tester.pumpWidget(_buildTestApp(cubit));

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('renders active links with their registrants', (tester) async {
    when(() => cubit.state).thenReturn(
      TournamentInviteLinksLoaded(
        links: [_link(registrants: [_registrant()])],
      ),
    );

    await tester.pumpWidget(_buildTestApp(cubit));

    expect(
      find.byKey(const Key('tournamentInviteLinks.tile.link-1')),
      findsOneWidget,
    );
    expect(find.textContaining('Juan Pérez'), findsOneWidget);
  });

  testWidgets('revoke action calls cubit.revoke with the link id', (
    tester,
  ) async {
    when(
      () => cubit.state,
    ).thenReturn(TournamentInviteLinksLoaded(links: [_link()]));
    when(() => cubit.revoke(any())).thenAnswer((_) async {});

    await tester.pumpWidget(_buildTestApp(cubit));
    await tester.tap(
      find.byKey(const Key('tournamentInviteLinks.revoke.link-1')),
    );
    await tester.pump();

    verify(() => cubit.revoke('link-1')).called(1);
  });

  testWidgets('separates revoked links from active ones', (tester) async {
    when(() => cubit.state).thenReturn(
      TournamentInviteLinksLoaded(
        links: [
          _link(id: 'active-1'),
          _link(id: 'revoked-1', revokedAt: DateTime(2026, 1, 15)),
        ],
      ),
    );

    await tester.pumpWidget(_buildTestApp(cubit));

    expect(
      find.byKey(const Key('tournamentInviteLinks.revoke.active-1')),
      findsOneWidget,
    );
    expect(
      find.byKey(const Key('tournamentInviteLinks.revoke.revoked-1')),
      findsNothing,
    );
    expect(
      find.byKey(const Key('tournamentInviteLinks.tile.revoked-1')),
      findsOneWidget,
    );
  });

  testWidgets('shows the empty state when there are no links yet', (
    tester,
  ) async {
    when(
      () => cubit.state,
    ).thenReturn(const TournamentInviteLinksLoaded(links: []));

    await tester.pumpWidget(_buildTestApp(cubit));

    expect(
      find.byKey(const Key('tournamentInviteLinks.empty')),
      findsOneWidget,
    );
  });
}
