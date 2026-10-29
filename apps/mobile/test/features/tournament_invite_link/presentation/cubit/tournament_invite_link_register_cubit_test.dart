import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/data/models/tournament_invite_link_dto.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/data/tournament_invite_link_repository.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/presentation/cubit/tournament_invite_link_register_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournament_invite_link/presentation/cubit/tournament_invite_link_register_state.dart';

class _MockTournamentInviteLinkRepository extends Mock
    implements TournamentInviteLinkRepository {}

TournamentInviteLinkPreviewDto _preview({
  bool acceptsRegistration = true,
  String status = 'OPEN',
}) => TournamentInviteLinkPreviewDto(
  tournamentId: 'tour-1',
  tournamentName: 'Torneo de Verano',
  sportName: 'Padel',
  categoryName: 'Cuarta',
  venueName: 'Club Central',
  startsAt: DateTime(2026, 3, 1),
  status: status,
  acceptsRegistration: acceptsRegistration,
);

TournamentInviteLinkRegistrationResultDto _result({
  String registrationType = 'GUEST',
}) => TournamentInviteLinkRegistrationResultDto(
  registrationId: 'reg-1',
  registrationType: registrationType,
  tournamentId: 'tour-1',
  status: 'PENDING',
);

void main() {
  group('TournamentInviteLinkRegisterCubit', () {
    late _MockTournamentInviteLinkRepository repository;

    const token = 'tok-1';

    setUp(() {
      repository = _MockTournamentInviteLinkRepository();
    });

    blocTest<TournamentInviteLinkRegisterCubit, TournamentInviteLinkRegisterState>(
      'loadPreview emits the preview when the link is valid',
      build: () {
        when(() => repository.preview(token: token))
            .thenAnswer((_) async => _preview());
        return TournamentInviteLinkRegisterCubit(
          tournamentInviteLinkRepository: repository,
          token: token,
        );
      },
      act: (cubit) => cubit.loadPreview(),
      expect: () => [
        const TournamentInviteLinkRegisterLoadingPreview(),
        isA<TournamentInviteLinkRegisterPreviewLoaded>()
            .having((s) => s.preview.tournamentName, 'preview.tournamentName', 'Torneo de Verano')
            .having((s) => s.isAuthenticated, 'isAuthenticated', false),
      ],
    );

    blocTest<TournamentInviteLinkRegisterCubit, TournamentInviteLinkRegisterState>(
      'loadPreview emits Invalid(EXPIRED) for an ENLACE_INVALIDO failure',
      build: () {
        when(() => repository.preview(token: token)).thenThrow(
          const AppFailure(code: 'ENLACE_INVALIDO', message: 'El enlace expiró.'),
        );
        return TournamentInviteLinkRegisterCubit(
          tournamentInviteLinkRepository: repository,
          token: token,
        );
      },
      act: (cubit) => cubit.loadPreview(),
      expect: () => [
        const TournamentInviteLinkRegisterLoadingPreview(),
        const TournamentInviteLinkRegisterInvalid(
          reason: 'EXPIRED',
          message: 'El enlace expiró.',
        ),
      ],
    );

    blocTest<TournamentInviteLinkRegisterCubit, TournamentInviteLinkRegisterState>(
      'loadPreview emits Invalid(REVOKED) for an ENLACE_REVOCADO failure',
      build: () {
        when(() => repository.preview(token: token)).thenThrow(
          const AppFailure(code: 'ENLACE_REVOCADO', message: 'El enlace fue revocado.'),
        );
        return TournamentInviteLinkRegisterCubit(
          tournamentInviteLinkRepository: repository,
          token: token,
        );
      },
      act: (cubit) => cubit.loadPreview(),
      expect: () => [
        const TournamentInviteLinkRegisterLoadingPreview(),
        const TournamentInviteLinkRegisterInvalid(
          reason: 'REVOKED',
          message: 'El enlace fue revocado.',
        ),
      ],
    );

    blocTest<TournamentInviteLinkRegisterCubit, TournamentInviteLinkRegisterState>(
      'loadPreview emits Invalid(EXHAUSTED) for an ENLACE_AGOTADO failure',
      build: () {
        when(() => repository.preview(token: token)).thenThrow(
          const AppFailure(code: 'ENLACE_AGOTADO', message: 'El enlace agotó sus usos.'),
        );
        return TournamentInviteLinkRegisterCubit(
          tournamentInviteLinkRepository: repository,
          token: token,
        );
      },
      act: (cubit) => cubit.loadPreview(),
      expect: () => [
        const TournamentInviteLinkRegisterLoadingPreview(),
        const TournamentInviteLinkRegisterInvalid(
          reason: 'EXHAUSTED',
          message: 'El enlace agotó sus usos.',
        ),
      ],
    );

    blocTest<TournamentInviteLinkRegisterCubit, TournamentInviteLinkRegisterState>(
      'register (authenticated) sends no guest fields and emits the result',
      build: () {
        when(() => repository.preview(token: token))
            .thenAnswer((_) async => _preview());
        when(
          () => repository.register(
            token: token,
            name: null,
            phone: null,
            email: null,
          ),
        ).thenAnswer((_) async => _result(registrationType: 'AUTHENTICATED'));
        return TournamentInviteLinkRegisterCubit(
          tournamentInviteLinkRepository: repository,
          token: token,
          isAuthenticated: true,
        );
      },
      act: (cubit) async {
        await cubit.loadPreview();
        await cubit.register(name: 'Ignorado', email: 'ignorado@mail.com');
      },
      skip: 2,
      expect: () => [
        isA<TournamentInviteLinkRegisterPreviewLoaded>()
            .having((s) => s.registering, 'registering', true),
        isA<TournamentInviteLinkRegisterPreviewLoaded>()
            .having((s) => s.registering, 'registering', false)
            .having(
              (s) => s.result?.registrationType,
              'result.registrationType',
              'AUTHENTICATED',
            ),
      ],
      verify: (_) {
        verify(
          () => repository.register(
            token: token,
            name: null,
            phone: null,
            email: null,
          ),
        ).called(1);
      },
    );

    blocTest<TournamentInviteLinkRegisterCubit, TournamentInviteLinkRegisterState>(
      'register (guest) sends the guest fields and emits the result',
      build: () {
        when(() => repository.preview(token: token))
            .thenAnswer((_) async => _preview());
        when(
          () => repository.register(
            token: token,
            name: 'Juan',
            phone: null,
            email: 'juan@mail.com',
          ),
        ).thenAnswer((_) async => _result(registrationType: 'GUEST'));
        return TournamentInviteLinkRegisterCubit(
          tournamentInviteLinkRepository: repository,
          token: token,
          isAuthenticated: false,
        );
      },
      act: (cubit) async {
        await cubit.loadPreview();
        await cubit.register(name: 'Juan', email: 'juan@mail.com');
      },
      skip: 2,
      expect: () => [
        isA<TournamentInviteLinkRegisterPreviewLoaded>()
            .having((s) => s.registering, 'registering', true),
        isA<TournamentInviteLinkRegisterPreviewLoaded>()
            .having((s) => s.registering, 'registering', false)
            .having(
              (s) => s.result?.registrationType,
              'result.registrationType',
              'GUEST',
            ),
      ],
      verify: (_) {
        verify(
          () => repository.register(
            token: token,
            name: 'Juan',
            phone: null,
            email: 'juan@mail.com',
          ),
        ).called(1);
      },
    );

    blocTest<TournamentInviteLinkRegisterCubit, TournamentInviteLinkRegisterState>(
      'register surfaces a CUPOS_AGOTADOS failure as registerError',
      build: () {
        when(() => repository.preview(token: token))
            .thenAnswer((_) async => _preview());
        when(
          () => repository.register(
            token: token,
            name: any(named: 'name'),
            phone: any(named: 'phone'),
            email: any(named: 'email'),
          ),
        ).thenThrow(
          const AppFailure(code: 'CUPOS_AGOTADOS', message: 'No quedan cupos.'),
        );
        return TournamentInviteLinkRegisterCubit(
          tournamentInviteLinkRepository: repository,
          token: token,
          isAuthenticated: true,
        );
      },
      act: (cubit) async {
        await cubit.loadPreview();
        await cubit.register();
      },
      skip: 2,
      expect: () => [
        isA<TournamentInviteLinkRegisterPreviewLoaded>()
            .having((s) => s.registering, 'registering', true),
        isA<TournamentInviteLinkRegisterPreviewLoaded>()
            .having((s) => s.registering, 'registering', false)
            .having((s) => s.registerError, 'registerError', 'No quedan cupos.'),
      ],
    );
  });
}
