import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/tournament_invite_link/data/models/tournament_invite_link_dto.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/presentation/cubit/tournament_invite_links_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/presentation/cubit/tournament_invite_links_state.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/presentation/widgets/generate_invite_link_sheet.dart';

class _MockTournamentInviteLinksCubit
    extends MockCubit<TournamentInviteLinksState>
    implements TournamentInviteLinksCubit {}

TournamentInviteLinkDto _generatedLink({String? token}) =>
    TournamentInviteLinkDto(
      id: 'link-1',
      expiresAt: DateTime(2026, 2, 1),
      maxUses: null,
      usesCount: 0,
      revokedAt: null,
      createdAt: DateTime(2026, 1, 1),
      token: token,
      url: token != null ? 'https://cuadrala.app/invite/$token' : null,
      deepLink: token != null ? 'https://cuadrala.app/invite/$token' : null,
    );

Widget _buildTestApp(TournamentInviteLinksCubit cubit) {
  return MaterialApp(
    home: Scaffold(
      body: BlocProvider<TournamentInviteLinksCubit>.value(
        value: cubit,
        child: const GenerateInviteLinkSheet(),
      ),
    ),
  );
}

void main() {
  late _MockTournamentInviteLinksCubit cubit;

  setUp(() {
    cubit = _MockTournamentInviteLinksCubit();
  });

  testWidgets('submit calls cubit.generate()', (tester) async {
    when(
      () => cubit.state,
    ).thenReturn(const TournamentInviteLinksLoaded(links: []));
    when(() => cubit.generate()).thenAnswer((_) async {});

    await tester.pumpWidget(_buildTestApp(cubit));
    await tester.tap(
      find.byKey(const Key('tournament.generateInviteLinkSheet.submit')),
    );
    await tester.pump();

    verify(() => cubit.generate()).called(1);
  });

  testWidgets('disables submit while generating', (tester) async {
    when(() => cubit.state).thenReturn(
      const TournamentInviteLinksLoaded(links: [], generating: true),
    );

    await tester.pumpWidget(_buildTestApp(cubit));

    final button = tester.widget<FilledButton>(
      find.byKey(const Key('tournament.generateInviteLinkSheet.submit')),
    );
    expect(button.onPressed, isNull);
  });

  testWidgets('shows the generate error message', (tester) async {
    when(() => cubit.state).thenReturn(
      const TournamentInviteLinksLoaded(
        links: [],
        generateError: 'No se pudo generar el link.',
      ),
    );

    await tester.pumpWidget(_buildTestApp(cubit));

    expect(
      find.byKey(const Key('tournament.generateInviteLinkSheet.error')),
      findsOneWidget,
    );
    expect(find.text('No se pudo generar el link.'), findsOneWidget);
  });

  testWidgets('shows the one-time token and the share action once generated', (
    tester,
  ) async {
    when(() => cubit.state).thenReturn(
      TournamentInviteLinksLoaded(
        links: const [],
        lastGeneratedLink: _generatedLink(token: 'raw-token-123'),
      ),
    );

    await tester.pumpWidget(_buildTestApp(cubit));

    expect(
      find.byKey(const Key('tournament.generateInviteLinkSheet.success')),
      findsOneWidget,
    );
    expect(
      find.byKey(const Key('tournament.generateInviteLinkSheet.share')),
      findsOneWidget,
    );
    expect(find.textContaining('raw-token-123'), findsOneWidget);
    // The default (no-override) generate call stays available once more —
    // REQ-TIL-001's default scenario, no extra fields to fill.
    expect(
      find.byKey(const Key('tournament.generateInviteLinkSheet.submit')),
      findsNothing,
    );
  });
}
