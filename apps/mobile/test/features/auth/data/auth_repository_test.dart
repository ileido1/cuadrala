import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/auth/data/auth_api.dart';
import 'package:cuadrala_mobile/src/features/auth/data/auth_repository.dart';
import 'package:cuadrala_mobile/src/features/auth/data/models/auth_tokens.dart';
import 'package:cuadrala_mobile/src/features/auth/data/models/login_request.dart';
import 'package:cuadrala_mobile/src/features/auth/data/models/register_request.dart';
import 'package:cuadrala_mobile/src/features/auth/data/secure_token_storage.dart';

class _MockAuthApi extends Mock implements AuthApi {}

class _MockSecureTokenStorage extends Mock implements SecureTokenStorage {}

void main() {
  group('AuthRepository', () {
    late AuthApi authApi;
    late SecureTokenStorage secureTokenStorage;
    late AuthRepository repository;

    setUp(() {
      authApi = _MockAuthApi();
      secureTokenStorage = _MockSecureTokenStorage();
      repository = AuthRepository(
        authApi: authApi,
        secureTokenStorage: secureTokenStorage,
      );
    });

    test('login persiste refresh token', () async {
      const request = LoginRequest(email: 'a@b.com', password: '12345678');
      const tokens = AuthTokens(accessToken: 'access', refreshToken: 'refresh');

      when(() => authApi.login(request)).thenAnswer((_) async => tokens);
      when(() => secureTokenStorage.writeRefreshToken('refresh'))
          .thenAnswer((_) async {});

      final result = await repository.login(request);

      expect(result, tokens);
      verify(() => authApi.login(request)).called(1);
      verify(() => secureTokenStorage.writeRefreshToken('refresh')).called(1);
    });

    test('register persiste refresh token', () async {
      const request = RegisterRequest(
        email: 'a@b.com',
        password: '12345678',
        name: 'Ana',
      );
      const tokens = AuthTokens(accessToken: 'access', refreshToken: 'refresh');

      when(() => authApi.register(request)).thenAnswer((_) async => tokens);
      when(() => secureTokenStorage.writeRefreshToken('refresh'))
          .thenAnswer((_) async {});

      final result = await repository.register(request);

      expect(result, tokens);
      verify(() => authApi.register(request)).called(1);
      verify(() => secureTokenStorage.writeRefreshToken('refresh')).called(1);
    });

    test('refresh usa token persistido y rota refresh', () async {
      when(() => secureTokenStorage.readRefreshToken())
          .thenAnswer((_) async => 'refresh');
      const tokens = AuthTokens(accessToken: 'a2', refreshToken: 'r2');
      when(() => authApi.refresh(refreshToken: 'refresh'))
          .thenAnswer((_) async => tokens);
      when(() => secureTokenStorage.writeRefreshToken('r2'))
          .thenAnswer((_) async {});

      final result = await repository.refresh();

      expect(result, tokens);
      verify(() => secureTokenStorage.readRefreshToken()).called(1);
      verify(() => authApi.refresh(refreshToken: 'refresh')).called(1);
      verify(() => secureTokenStorage.writeRefreshToken('r2')).called(1);
    });

    test(
      'llamadas concurrentes a refresh() comparten un único request en vuelo '
      '(single-flight) en vez de disparar uno cada una',
      () async {
        // Issue encontrado en vivo: AuthTokenInterceptor no deduplica
        // refreshSession() entre requests 401 concurrentes. El backend rota
        // el refresh token en cada uso (single-use) — si dos llamadas a
        // refresh() llegan a authApi.refresh() por separado, la segunda usa
        // un token ya invalidado por la primera y falla, forzando un logout
        // aunque la sesión seguía siendo válida. El fix: refresh() debe
        // devolver el MISMO Future a todo el que lo llame mientras uno ya
        // está en curso, para que el backend solo vea un request real.
        when(() => secureTokenStorage.readRefreshToken())
            .thenAnswer((_) async => 'refresh');
        const tokens = AuthTokens(accessToken: 'a2', refreshToken: 'r2');
        when(() => authApi.refresh(refreshToken: 'refresh')).thenAnswer((
          _,
        ) async {
          await Future<void>.delayed(const Duration(milliseconds: 20));
          return tokens;
        });
        when(
          () => secureTokenStorage.writeRefreshToken('r2'),
        ).thenAnswer((_) async {});

        final results = await Future.wait([
          repository.refresh(),
          repository.refresh(),
        ]);

        expect(results[0], tokens);
        expect(results[1], tokens);
        verify(() => authApi.refresh(refreshToken: 'refresh')).called(1);
      },
    );

    test('logout limpia storage aunque falle red', () async {
      when(() => secureTokenStorage.readRefreshToken())
          .thenAnswer((_) async => 'refresh');
      when(() => authApi.logout(refreshToken: 'refresh'))
          .thenThrow(Exception('network down'));
      when(() => secureTokenStorage.deleteRefreshToken())
          .thenAnswer((_) async {});

      await repository.logout();

      verify(() => authApi.logout(refreshToken: 'refresh')).called(1);
      verify(() => secureTokenStorage.deleteRefreshToken()).called(1);
    });

    //? CUADRALA-MOBILE-4: el future derivado de `whenComplete` heredaba el
    //? error y nadie lo escuchaba, así que llegaba como no capturado aunque
    //? el llamador sí capturara el fallo.
    test(
      'should not leak an uncaught error when refresh fails and the caller handles it',
      () async {
        when(
          () => secureTokenStorage.readRefreshToken(),
        ).thenAnswer((_) async => null);
        final uncaught = <Object>[];

        await runZonedGuarded(() async {
          final failure = await repository.refreshOrFailure();
          expect(failure.code, 'AUTH_NO_REFRESH_TOKEN');
          await Future<void>.delayed(Duration.zero);
        }, (e, _) => uncaught.add(e));

        expect(uncaught, isEmpty);
      },
    );
  });
}
