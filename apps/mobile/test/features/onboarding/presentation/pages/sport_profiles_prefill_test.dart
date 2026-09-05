import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/models/category_dto.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/models/sport_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/player_sport_profile_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_cubit.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_state.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/pages/sport_profiles_page.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/player_profile_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

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

void main() {
  group('OnboardingSportProfilesPage prefill', () {
    late OnboardingCubit cubit;
    late OnboardingRepository onboardingRepository;
    late CatalogRepository catalogRepository;
    late ProfileRepository profileRepository;

    setUp(() {
      cubit = _MockOnboardingCubit();
      onboardingRepository = _MockOnboardingRepository();
      catalogRepository = _MockCatalogRepository();
      profileRepository = _MockProfileRepository();

      when(() => cubit.state).thenReturn(OnboardingState.initial());
      when(() => cubit.stream).thenAnswer((_) => Stream.value(cubit.state));

      when(() => catalogRepository.listSports())
          .thenAnswer((_) async => const [_padel, _tennis]);
      when(() => catalogRepository.listCategories(sportId: any(named: 'sportId')))
          .thenAnswer((_) async => const [_padelCuarta]);
      when(() => profileRepository.getPlayerProfile())
          .thenAnswer((_) async => const PlayerProfileDto(dominantHand: 'LEFT'));

      final getIt = GetIt.instance;
      getIt.registerSingleton<OnboardingRepository>(onboardingRepository);
      getIt.registerSingleton<CatalogRepository>(catalogRepository);
      getIt.registerSingleton<ProfileRepository>(profileRepository);
    });

    tearDown(() {
      final getIt = GetIt.instance;
      getIt.unregister<OnboardingRepository>();
      getIt.unregister<CatalogRepository>();
      getIt.unregister<ProfileRepository>();
    });

    Future<void> pumpPage(WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: BlocProvider<OnboardingCubit>.value(
            value: cubit,
            child: Scaffold(
              body: OnboardingSportProfilesPage(onContinue: () {}),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets(
      'should restore the saved sport so a later PUT does not wipe it',
      (tester) async {
        // El PUT reemplaza la lista entera: si el pádel guardado no vuelve
        // seleccionado, guardar desde acá lo borraría.
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

        await pumpPage(tester);

        // La tarjeta de clasificación sólo se renderiza para deportes elegidos.
        expect(find.text('Tu banda de nivel'), findsOneWidget);
        expect(find.text('Revés (izquierda)'), findsOneWidget);
        expect(find.text('Zurdo'), findsOneWidget);
      },
    );

    testWidgets('should select nothing when there are no saved profiles',
        (tester) async {
      when(() => onboardingRepository.listSportProfiles())
          .thenAnswer((_) async => const []);

      await pumpPage(tester);

      expect(find.text('Tu banda de nivel'), findsNothing);
      expect(find.text('Pádel'), findsOneWidget);
      expect(find.text('Tenis'), findsOneWidget);
    });
  });
}
