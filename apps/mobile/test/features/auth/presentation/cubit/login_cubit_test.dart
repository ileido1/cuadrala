import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/features/auth/data/auth_repository.dart';
import 'package:cuadrala_mobile/src/features/auth/data/models/auth_tokens.dart';
import 'package:cuadrala_mobile/src/features/auth/data/models/login_request.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/login_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/login_state.dart';

class _MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  group('LoginCubit', () {
    late AuthRepository authRepository;

    setUpAll(() {
      registerFallbackValue(
        const LoginRequest(email: 'fallback@cuadrala.app', password: '12345678'),
      );
    });

    setUp(() {
      authRepository = _MockAuthRepository();
    });

    blocTest<LoginCubit, LoginState>(
      'submit: loading → success',
      build: () {
        when(() => authRepository.login(any())).thenAnswer(
          (_) async => const AuthTokens(accessToken: 'a', refreshToken: 'r'),
        );
        return LoginCubit(authRepository: authRepository);
      },
      act: (cubit) => cubit.submit(
        const LoginRequest(email: 'a@b.com', password: '12345678'),
      ),
      expect: () => const <LoginState>[
        LoginState.loading(),
        LoginState.success(),
      ],
    );

    blocTest<LoginCubit, LoginState>(
      'submit: loading → failure con mensaje español',
      build: () {
        when(() => authRepository.login(any())).thenThrow(
          const AppFailure(code: 'AUTH_INVALID', message: 'Credenciales inválidas'),
        );
        return LoginCubit(authRepository: authRepository);
      },
      act: (cubit) => cubit.submit(
        const LoginRequest(email: 'a@b.com', password: 'bad'),
      ),
      expect: () => const <LoginState>[
        LoginState.loading(),
        LoginState.failure(message: 'Credenciales inválidas'),
      ],
    );
  });
}
