import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';
import 'package:cuadrala_mobile/src/features/auth/data/models/register_request.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/register_cubit.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/cubit/register_state.dart';
import 'package:cuadrala_mobile/src/features/auth/presentation/register_screen.dart';

class _MockRegisterCubit extends MockCubit<RegisterState>
    implements RegisterCubit {}

void main() {
  late RegisterCubit registerCubit;

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
    registerCubit = _MockRegisterCubit();
    whenListen(
      registerCubit,
      Stream<RegisterState>.value(const RegisterState.idle()),
      initialState: const RegisterState.idle(),
    );
  });

  Widget wrap() {
    return MaterialApp(
      theme: AppTheme.light(),
      home: BlocProvider<RegisterCubit>.value(
        value: registerCubit,
        child: const RegisterScreen(),
      ),
    );
  }

  testWidgets('blocks invalid email, short password and empty confirmation', (
    tester,
  ) async {
    when(() => registerCubit.submit(any())).thenAnswer((_) async {});

    await tester.pumpWidget(wrap());
    await tester.tap(find.text('Continuar'));
    await tester.pump();

    expect(find.text('Ingresá tu correo electrónico'), findsOneWidget);
    expect(find.text('Ingresá una contraseña'), findsOneWidget);
    expect(find.text('Confirmá tu contraseña'), findsOneWidget);
    verifyNever(() => registerCubit.submit(any()));
  });

  testWidgets('submits only when the registration fields are valid', (
    tester,
  ) async {
    when(() => registerCubit.submit(any())).thenAnswer((_) async {});

    await tester.pumpWidget(wrap());
    await tester.enterText(
      find.byKey(const Key('register.email')),
      'jugador@cuadrala.app',
    );
    await tester.enterText(
      find.byKey(const Key('register.password')),
      '12345678',
    );
    await tester.enterText(
      find.byKey(const Key('register.confirm_password')),
      '12345678',
    );
    await tester.tap(find.text('Continuar'));
    await tester.pump();

    verify(
      () => registerCubit.submit(
        const RegisterRequest(
          email: 'jugador@cuadrala.app',
          password: '12345678',
          name: 'Jugador',
        ),
      ),
    ).called(1);
  });
}
