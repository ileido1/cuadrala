import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/models/category_dto.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/models/sport_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/create_tournament_request.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/create_tournament_response.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/format_parameter_field_def.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_preset_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/tournaments_repository.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/create_tournament_screen.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/create_tournament_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/cubit/tournament_presets_cubit.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/dynamic_format_parameters_form.dart';

class _MockCatalogRepository extends Mock implements CatalogRepository {}

class _MockTournamentsRepository extends Mock implements TournamentsRepository {}

const _sports = [
  SportDto(id: 'padel', code: 'PADEL', name: 'Pádel'),
  SportDto(id: 'tenis', code: 'TENNIS', name: 'Tenis'),
];

const _categories = [
  CategoryDto(
    id: 'cat-padel',
    sportId: 'padel',
    name: 'Padel Cuarta',
    slug: 'padel-cuarta',
    scheme: 'NUMERIC',
    sortOrder: 1,
  ),
  CategoryDto(
    id: 'cat-tenis',
    sportId: 'tenis',
    name: 'Tenis Libre',
    slug: 'tenis-libre',
    scheme: 'NUMERIC',
    sortOrder: 1,
  ),
];

const _presetWithSchema = TournamentPresetDto(
  id: 'preset-rr',
  sportId: 'padel',
  code: 'ROUND_ROBIN',
  version: 1,
  name: 'Liga',
  schemaVersion: 1,
  defaultParameters: null,
  parametersSchema: [
    EnumFieldDef(
      key: 'modality',
      label: 'Modalidad',
      required: true,
      options: [
        EnumOption(value: 'SINGLES', label: 'Singles'),
        EnumOption(value: 'DOUBLES', label: 'Dobles'),
      ],
    ),
    IntFieldDef(key: 'rounds', label: 'Rondas', min: 1, max: 5),
  ],
);

//? Mirrors the seeded AMERICANO preset: `rounds` has an API default that must
//? win over the field minimum, `thirdPlaceMatch` has none and falls back.
const _presetWithDefaults = TournamentPresetDto(
  id: 'preset-am',
  sportId: 'padel',
  code: 'AMERICANO',
  version: 1,
  name: 'Americano',
  schemaVersion: 1,
  defaultParameters: {'rounds': 3},
  parametersSchema: [
    IntFieldDef(key: 'rounds', label: 'Rondas', required: true, min: 1, max: 50),
    BooleanFieldDef(key: 'thirdPlaceMatch', label: 'Tercer lugar', required: true),
  ],
);

const _presetWithoutSchema = TournamentPresetDto(
  id: 'preset-se',
  sportId: 'padel',
  code: 'SINGLE_ELIMINATION',
  version: 1,
  name: 'Llaves',
  schemaVersion: 1,
  defaultParameters: null,
);

/// Registers the screen dependencies in getIt with mocked repositories.
Future<void> _setupGetIt(
  _MockCatalogRepository catalogRepository,
  _MockTournamentsRepository tournamentsRepository,
) async {
  await getIt.reset();
  getIt.registerLazySingleton<CatalogRepository>(() => catalogRepository);
  getIt.registerFactory<CreateTournamentCubit>(
    () => CreateTournamentCubit(tournamentsRepository: tournamentsRepository),
  );
  getIt.registerFactory<TournamentPresetsCubit>(
    () => TournamentPresetsCubit(tournamentsRepository: tournamentsRepository),
  );
}

/// Pumps the screen with a tall viewport so the lazy ListView builds every
/// section (presets and format parameters sit below the fold).
Future<void> _pumpScreen(WidgetTester tester) async {
  tester.view.physicalSize = const Size(1200, 4000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);

  await tester.pumpWidget(const MaterialApp(home: CreateTournamentScreen()));
  await tester.pumpAndSettle();
}

Future<void> _enterName(WidgetTester tester) async {
  await tester.enterText(find.byType(TextField), 'Torneo de Otoño');
  await tester.pumpAndSettle();
}

Future<void> _selectPreset(WidgetTester tester, String name) async {
  await tester.tap(find.text(name));
  await tester.pumpAndSettle();
}

FilledButton _submitButton(WidgetTester tester) =>
    tester.widget<FilledButton>(find.bySubtype<FilledButton>());

Finder _inForm(Finder matching) => find.descendant(
  of: find.byType(DynamicFormatParametersForm),
  matching: matching,
);

void main() {
  late _MockCatalogRepository catalogRepository;
  late _MockTournamentsRepository tournamentsRepository;

  setUp(() async {
    catalogRepository = _MockCatalogRepository();
    tournamentsRepository = _MockTournamentsRepository();

    when(() => catalogRepository.listSports()).thenAnswer((_) async => _sports);
    when(() => catalogRepository.listCategories()).thenAnswer((_) async => _categories);
    when(
      () => tournamentsRepository.getPresetsBySportId(sportId: any(named: 'sportId')),
    ).thenAnswer(
      (_) async => [_presetWithSchema, _presetWithDefaults, _presetWithoutSchema],
    );
    //? Empty id makes the cubit emit an error, so the screen never navigates
    //? (there is no GoRouter in these tests).
    when(
      () => tournamentsRepository.createTournament(request: any(named: 'request')),
    ).thenAnswer((_) async => const CreateTournamentResponse(tournamentId: ''));

    await _setupGetIt(catalogRepository, tournamentsRepository);
  });

  tearDown(() async => getIt.reset());

  group('format parameters', () {
    testWidgets('should render schema fields when the preset has parametersSchema', (
      tester,
    ) async {
      await _pumpScreen(tester);

      await _selectPreset(tester, 'Liga');

      expect(find.byType(DynamicFormatParametersForm), findsOneWidget);
      expect(_inForm(find.text('Modalidad')), findsOneWidget);
      expect(_inForm(find.text('Rondas')), findsOneWidget);
    });

    testWidgets('should not render the form when the preset has no schema', (
      tester,
    ) async {
      await _pumpScreen(tester);

      await _selectPreset(tester, 'Llaves');

      expect(find.byType(DynamicFormatParametersForm), findsNothing);
    });
  });

  group('submit button', () {
    testWidgets('should be disabled while a required schema field has no value', (
      tester,
    ) async {
      await _pumpScreen(tester);
      await _enterName(tester);

      await _selectPreset(tester, 'Liga');

      expect(_submitButton(tester).onPressed, isNull);
    });

    testWidgets('should be enabled once the required schema field is set', (
      tester,
    ) async {
      await _pumpScreen(tester);
      await _enterName(tester);
      await _selectPreset(tester, 'Liga');

      await tester.tap(find.widgetWithText(ChoiceChip, 'Dobles'));
      await tester.pumpAndSettle();

      expect(_submitButton(tester).onPressed, isNotNull);
    });
  });

  group('submit request', () {
    testWidgets('should send formatParameters with the values set in the form', (
      tester,
    ) async {
      await _pumpScreen(tester);
      await _enterName(tester);
      await _selectPreset(tester, 'Liga');
      await tester.tap(find.widgetWithText(ChoiceChip, 'Dobles'));
      await tester.pumpAndSettle();
      await tester.tap(_inForm(find.byIcon(Icons.add)));
      await tester.pumpAndSettle();

      await tester.tap(find.bySubtype<FilledButton>());
      await tester.pumpAndSettle();

      final request =
          verify(
                () => tournamentsRepository.createTournament(
                  request: captureAny(named: 'request'),
                ),
              ).captured.single
              as CreateTournamentRequest;
      expect(request.formatPresetId, 'preset-rr');
      expect(request.formatParameters, {'modality': 'DOUBLES', 'rounds': 2});
    });

    testWidgets('should send null formatParameters when nothing was set', (
      tester,
    ) async {
      await _pumpScreen(tester);
      await _enterName(tester);
      await _selectPreset(tester, 'Llaves');

      await tester.tap(find.bySubtype<FilledButton>());
      await tester.pumpAndSettle();

      final request =
          verify(
                () => tournamentsRepository.createTournament(
                  request: captureAny(named: 'request'),
                ),
              ).captured.single
              as CreateTournamentRequest;
      expect(request.formatPresetId, 'preset-se');
      expect(request.formatParameters, isNull);
    });
  });

  group('default values', () {
    testWidgets('should display the preset default instead of the field minimum', (
      tester,
    ) async {
      await _pumpScreen(tester);

      await _selectPreset(tester, 'Americano');

      expect(_inForm(find.text('3')), findsOneWidget);
    });

    testWidgets('should enable submit when required fields are untouched but have defaults', (
      tester,
    ) async {
      await _pumpScreen(tester);
      await _enterName(tester);

      await _selectPreset(tester, 'Americano');

      expect(_submitButton(tester).onPressed, isNotNull);
    });

    testWidgets('should send the displayed defaults when fields are untouched', (
      tester,
    ) async {
      await _pumpScreen(tester);
      await _enterName(tester);
      await _selectPreset(tester, 'Americano');

      await tester.tap(find.bySubtype<FilledButton>());
      await tester.pumpAndSettle();

      final request =
          verify(
                () => tournamentsRepository.createTournament(
                  request: captureAny(named: 'request'),
                ),
              ).captured.single
              as CreateTournamentRequest;
      expect(request.formatParameters, {'rounds': 3, 'thirdPlaceMatch': false});
    });
  });

  testWidgets('should clear the selected preset and parameter values when sport changes', (
    tester,
  ) async {
    await _pumpScreen(tester);
    await _enterName(tester);
    await _selectPreset(tester, 'Liga');
    await tester.tap(find.widgetWithText(ChoiceChip, 'Dobles'));
    await tester.pumpAndSettle();
    expect(_submitButton(tester).onPressed, isNotNull);

    await tester.tap(find.widgetWithText(ChoiceChip, 'Tenis'));
    await tester.pumpAndSettle();

    //? Preset cleared: no form, submit disabled.
    expect(find.byType(DynamicFormatParametersForm), findsNothing);
    expect(_submitButton(tester).onPressed, isNull);

    //? Re-selecting the same preset shows no previous value: the enum chip is
    //? unselected and the required field blocks submit again.
    await _selectPreset(tester, 'Liga');
    expect(tester.widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'Dobles')).selected, isFalse);
    expect(_submitButton(tester).onPressed, isNull);
  });
}
