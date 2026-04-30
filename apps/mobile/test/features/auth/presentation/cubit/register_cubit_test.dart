import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/auth/data/auth_repository.dart';
import 'package:cuadrala_mobile/src/features/auth/data/models/auth_tokens.dart';
import 'package:cuadrala_mobile/src/features/auth/data/models/register_request.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/register_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/register_state.dart';

class _MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  group('RegisterCubit', () {
    late AuthRepository authRepository;

    setUpAll(() {
      registerFallbackValue(
        const RegisterRequest(
          email: 'fallback@cuadrala.app',
          password: '12345678',
          name: 'Fallback',
        ),
      );
    });

    setUp(() {
      authRepository = _MockAuthRepository();
    });

    blocTest<RegisterCubit, RegisterState>(
      'submit: loading → success',
      build: () {
        when(() => authRepository.register(any())).thenAnswer(
          (_) async => const AuthTokens(accessToken: 'a', refreshToken: 'r'),
        );
        return RegisterCubit(authRepository: authRepository);
      },
      act: (cubit) => cubit.submit(
        const RegisterRequest(
          email: 'a@b.com',
          password: '12345678',
          name: 'Ana',
        ),
      ),
      expect: () => const <RegisterState>[
        RegisterState.loading(),
        RegisterState.success(),
      ],
    );

    blocTest<RegisterCubit, RegisterState>(
      'submit: loading → failure con mensaje español',
      build: () {
        when(() => authRepository.register(any())).thenThrow(
          const AppFailure(
            code: 'AUTH_EMAIL_TAKEN',
            message: 'El email ya está registrado',
          ),
        );
        return RegisterCubit(authRepository: authRepository);
      },
      act: (cubit) => cubit.submit(
        const RegisterRequest(
          email: 'a@b.com',
          password: '12345678',
          name: 'Ana',
        ),
      ),
      expect: () => const <RegisterState>[
        RegisterState.loading(),
        RegisterState.failure(message: 'El email ya está registrado'),
      ],
    );
  });
}
