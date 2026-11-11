import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/models/category_dto.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/models/sport_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/player_sport_profile_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_cubit.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_state.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/my_sports_screen.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/player_profile_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

import '../../../helpers/golden_harness.dart';

class _MockOnboardingCubit extends MockCubit<OnboardingState>
    implements OnboardingCubit {}

class _MockOnboardingRepository extends Mock implements OnboardingRepository {}

class _MockCatalogRepository extends Mock implements CatalogRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

const _padel = SportDto(id: 'sport-padel', code: 'PADEL', name: 'Pádel');
const _tennis = SportDto(id: 'sport-tennis', code: 'TENNIS', name: 'Tenis');

const _padelCuarta = CategoryDto(
  id: 'cat-padel-4ta',
  sportId: 'sport-padel',
  name: '4ta',
  slug: '4ta',
  scheme: 'RACKET_ORDINAL',
  skillBand: 'INTERMEDIATE',
  sortOrder: 4,
);

//? Issue #116: my_sports_screen.dart reusa la página de perfiles deportivos
//? del onboarding, que ya tenía tests de comportamiento pero ningún golden.
//? Cubre la lista sin deportes guardados y la precarga de un pádel guardado.
void main() {
  late OnboardingCubit cubit;
  late OnboardingRepository onboardingRepository;
  late CatalogRepository catalogRepository;
  late ProfileRepository profileRepository;

  setUpAll(loadGoldenFonts);

  setUp(() async {
    await getIt.reset();
    cubit = _MockOnboardingCubit();
    onboardingRepository = _MockOnboardingRepository();
    catalogRepository = _MockCatalogRepository();
    profileRepository = _MockProfileRepository();

    when(() => cubit.state).thenReturn(OnboardingState.initial());
    when(() => cubit.stream).thenAnswer((_) => Stream.value(cubit.state));
    when(
      () => catalogRepository.listSports(),
    ).thenAnswer((_) async => const [_padel, _tennis]);
    when(
      () => catalogRepository.listCategories(sportId: any(named: 'sportId')),
    ).thenAnswer((_) async => const [_padelCuarta]);
    when(
      () => profileRepository.getPlayerProfile(),
    ).thenAnswer((_) async => const PlayerProfileDto(dominantHand: 'LEFT'));

    //? MySportsScreen crea su cubit desde getIt y la página lee catálogo,
    //? perfiles y jugador desde getIt.
    getIt.registerSingleton<OnboardingCubit>(cubit);
    getIt.registerSingleton<OnboardingRepository>(onboardingRepository);
    getIt.registerSingleton<CatalogRepository>(catalogRepository);
    getIt.registerSingleton<ProfileRepository>(profileRepository);
  });

  tearDown(() async {
    await getIt.reset();
  });

  for (final brightness in Brightness.values) {
    testWidgets('Mis deportes — sin deportes ${brightness.name}', (
      tester,
    ) async {
      when(
        () => onboardingRepository.listSportProfiles(),
      ).thenAnswer((_) async => const []);

      await pumpGolden(
        tester,
        brightness: brightness,
        child: const MySportsScreen(),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile('goldens/my_sports_screen_empty_${brightness.name}.png'),
      );
    });

    testWidgets('Mis deportes — pádel guardado ${brightness.name}', (
      tester,
    ) async {
      when(() => onboardingRepository.listSportProfiles()).thenAnswer(
        (_) async => const [
          PlayerSportProfileDto(
            id: 'profile-1',
            sportId: 'sport-padel',
            skillLevel: 3.5,
            sidePreference: SidePreference.left,
            categoryId: 'cat-padel-4ta',
          ),
        ],
      );

      await pumpGolden(
        tester,
        brightness: brightness,
        child: const MySportsScreen(),
      );
      await tester.pumpAndSettle();

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/my_sports_screen_saved_padel_${brightness.name}.png',
        ),
      );
    });
  }
}
