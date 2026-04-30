import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/auth/data/auth_repository.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/login_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/session_state.dart';
import 'package:cuadrala_mobile/src/router/app_router.dart';

class _MockSessionCubit extends MockCubit<SessionState> implements SessionCubit {}
class _MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  group('Deep links (go_router)', () {
    setUp(() async {
      await getIt.reset();
      getIt.registerSingleton<AuthRepository>(_MockAuthRepository());
      getIt.registerFactory<LoginCubit>(
        () => LoginCubit(authRepository: getIt<AuthRepository>()),
      );
    });

    testWidgets('si está autenticado, abre deep link protegido', (tester) async {
      final sessionCubit = _MockSessionCubit();
      when(() => sessionCubit.state).thenReturn(const SessionState.authenticated());
      whenListen(sessionCubit, const Stream<SessionState>.empty());

      final router = AppRouter(sessionCubit: sessionCubit).router;
      router.go('/matches/123');

      await tester.pumpWidget(
        MaterialApp.router(
          routerConfig: router,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('match.detail')), findsOneWidget);
    });

    testWidgets('si NO está autenticado, deep link protegido redirige a login',
        (tester) async {
      final sessionCubit = _MockSessionCubit();
      when(() => sessionCubit.state).thenReturn(const SessionState.unauthenticated());
      whenListen(sessionCubit, const Stream<SessionState>.empty());

      final router = AppRouter(sessionCubit: sessionCubit).router;
      router.go('/matches/123');

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('login.screen')), findsOneWidget);
    });
  });
}
