import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/models/sport_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_cubit.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/pages/sport_profiles_page.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

class _MockCatalogRepository extends Mock implements CatalogRepository {}

class _MockOnboardingRepository extends Mock implements OnboardingRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

void main() {
  late OnboardingCubit cubit;
  late _MockCatalogRepository catalogRepository;
  late _MockOnboardingRepository onboardingRepository;
  late _MockProfileRepository profileRepository;

  setUp(() {
    catalogRepository = _MockCatalogRepository();
    onboardingRepository = _MockOnboardingRepository();
    profileRepository = _MockProfileRepository();
    getIt.registerSingleton<CatalogRepository>(catalogRepository);
    getIt.registerSingleton<OnboardingRepository>(onboardingRepository);
    getIt.registerSingleton<ProfileRepository>(profileRepository);

    when(() => catalogRepository.listSports()).thenAnswer((_) async => const [
          SportDto(id: 'sport-1', code: 'PADEL', name: 'Pádel'),
        ]);
    when(() => onboardingRepository.listSportProfiles())
        .thenAnswer((_) async => const []);

    cubit = OnboardingCubit(
      repository: onboardingRepository,
      profileRepository: profileRepository,
    );
  });

  tearDown(() {
    cubit.close();
    getIt
      ..unregister<CatalogRepository>()
      ..unregister<OnboardingRepository>()
      ..unregister<ProfileRepository>();
  });

  Future<void> pumpPage(WidgetTester tester, {bool isActive = true}) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BlocProvider<OnboardingCubit>.value(
            value: cubit,
            child: OnboardingSportProfilesPage(
              onContinue: () {},
              isActive: isActive,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  // Issue #137: el PageView del onboarding precarga la página siguiente
  // (SliverFillViewport + cache extent por defecto de Flutter), así que esta
  // página disparaba listSports()/listSportProfiles()/getPlayerProfile()
  // mientras el usuario seguía en la página anterior — sumando llamadas
  // autenticadas concurrentes a las que ya dispara el mount del onboarding.
  // Mismo patrón ya usado en OnboardingLocationPage (isActive gating).
  testWidgets('does not load sports until the step becomes active', (
    tester,
  ) async {
    await pumpPage(tester, isActive: false);

    verifyNever(() => catalogRepository.listSports());
  });

  testWidgets('loads sports once the step becomes active', (tester) async {
    await pumpPage(tester, isActive: false);
    verifyNever(() => catalogRepository.listSports());

    await pumpPage(tester);

    verify(() => catalogRepository.listSports()).called(1);
  });
}
