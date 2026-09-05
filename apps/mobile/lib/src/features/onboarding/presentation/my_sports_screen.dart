import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import 'cubit/onboarding_cubit.dart';
import 'pages/sport_profiles_page.dart';

/// "Mis deportes": la misma página del onboarding, fuera del onboarding.
///
/// El onboarding era de un solo tiro: quien elegía sólo pádel no tenía forma de
/// declarar su categoría de tenis después, y la API lo frenaba con
/// `CATEGORIA_NO_COMPATIBLE` al crear o unirse a un partido de otro deporte.
/// Esta pantalla reusa la página tal cual —ya precarga lo guardado— para que
/// agregar un deporte no exija rehacer el onboarding.
class MySportsScreen extends StatelessWidget {
  const MySportsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<OnboardingCubit>(
      create: (_) => getIt<OnboardingCubit>(),
      child: Scaffold(
        appBar: AppBar(title: const Text('Mis deportes')),
        body: Builder(
          builder: (context) => OnboardingSportProfilesPage(
            onContinue: () {
              if (context.canPop()) context.pop();
            },
          ),
        ),
      ),
    );
  }
}
