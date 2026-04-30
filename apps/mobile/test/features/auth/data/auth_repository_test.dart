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
  });
}
