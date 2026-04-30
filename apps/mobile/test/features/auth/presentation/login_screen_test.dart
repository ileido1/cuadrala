import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/auth/data/models/login_request.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/login_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/login_state.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/login_screen.dart';

class _MockLoginCubit extends MockCubit<LoginState> implements LoginCubit {}

void main() {
  group('LoginScreen', () {
    late LoginCubit loginCubit;

    setUpAll(() {
      registerFallbackValue(
        const LoginRequest(email: 'fallback@cuadrala.app', password: '12345678'),
      );
    });

    setUp(() {
      loginCubit = _MockLoginCubit();
    });

    Widget wrap() {
      return MaterialApp(
        home: BlocProvider<LoginCubit>.value(
          value: loginCubit,
          child: const LoginScreen(),
        ),
      );
    }

    testWidgets('renderiza campos y botón', (tester) async {
      when(() => loginCubit.state).thenReturn(const LoginState.idle());

      await tester.pumpWidget(wrap());

      expect(find.byKey(const Key('login.screen')), findsOneWidget);
      expect(find.byKey(const Key('login.email')), findsOneWidget);
      expect(find.byKey(const Key('login.password')), findsOneWidget);
      expect(find.byKey(const Key('login.submit')), findsOneWidget);
    });

    testWidgets('al tocar entrar llama submit', (tester) async {
      when(() => loginCubit.state).thenReturn(const LoginState.idle());
      when(() => loginCubit.submit(any())).thenAnswer((_) async {});

      await tester.pumpWidget(wrap());

      await tester.enterText(find.byKey(const Key('login.email')), 'a@b.com');
      await tester.enterText(find.byKey(const Key('login.password')), '12345678');
      await tester.tap(find.byKey(const Key('login.submit')));

      verify(
        () => loginCubit.submit(
          const LoginRequest(email: 'a@b.com', password: '12345678'),
        ),
      ).called(1);
    });

    testWidgets('muestra error cuando state es failure', (tester) async {
      whenListen(
        loginCubit,
        Stream<LoginState>.fromIterable(
          const [
            LoginState.idle(),
            LoginState.failure(message: 'Credenciales inválidas'),
          ],
        ),
        initialState: const LoginState.idle(),
      );
      when(() => loginCubit.state)
          .thenReturn(const LoginState.failure(message: 'Credenciales inválidas'));

      await tester.pumpWidget(wrap());
      await tester.pump();

      expect(find.text('Credenciales inválidas'), findsOneWidget);
    });
  });
}
