import 'package:cuadrala_mobile/src/app/app.dart';
import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/theme/app_theme.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_api.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_cubit.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/pages/identity_page.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:phone_form_field/phone_form_field.dart';

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockOnboardingApi extends Mock implements OnboardingApi {}

void main() {
  late OnboardingCubit cubit;
  late ProfileRepository profile;
  late OnboardingApi api;

  setUp(() {
    profile = _MockProfileRepository();
    api = _MockOnboardingApi();
    when(() => profile.getMe()).thenAnswer(
      (_) async => const UserMeDto(
        id: 'player',
        email: 'player@example.com',
        name: 'Carlos Rodriguez',
        subscriptionType: 'FREE',
      ),
    );
    getIt.registerSingleton<ProfileRepository>(profile);
    cubit = OnboardingCubit(
      repository: OnboardingRepository(api: api),
      profileRepository: profile,
    );
  });

  tearDown(() async {
    await cubit.close();
    await getIt.reset();
  });

  Future<void> pumpPage(WidgetTester tester) async {
    tester.view.physicalSize = const Size(1440, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('es'),
        supportedLocales: const [Locale('es')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        theme: AppTheme.dark(),
        builder: (context, child) => WebMobileFrame(child: child!),
        home: Scaffold(
          body: BlocProvider<OnboardingCubit>.value(
            value: cubit,
            child: OnboardingIdentityPage(onContinue: () {}),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> openPicker(WidgetTester tester) async {
    await tester.ensureVisible(find.text('Selecciona tu fecha de nacimiento'));
    await tester.tap(find.text('Selecciona tu fecha de nacimiento'));
    await tester.pumpAndSettle();
  }

  testWidgets('should default to Venezuela when the phone is empty', (
    tester,
  ) async {
    await pumpPage(tester);
    final phone = tester.widget<PhoneFormField>(find.byType(PhoneFormField));
    expect(phone.controller!.value.isoCode, IsoCode.VE);
    expect(find.text('+ 58'), findsOneWidget);
    expect(phone.isCountrySelectionEnabled, isTrue);
  });

  testWidgets('should preserve a foreign phone and country when rebuilding', (
    tester,
  ) async {
    await pumpPage(tester);
    final controller = tester
        .widget<PhoneFormField>(find.byType(PhoneFormField))
        .controller!;
    controller.changeCountry(IsoCode.ES);
    controller.changeNationalNumber('612345678');
    await tester.enterText(find.byType(TextFormField).first, 'Maria Perez');
    await tester.pumpAndSettle();
    expect(controller.value.international, '+34612345678');
    expect(find.text('+ 34'), findsOneWidget);
  });

  testWidgets('should open a compact Spanish year picker when on desktop', (
    tester,
  ) async {
    await pumpPage(tester);
    await openPicker(tester);
    final picker = tester.widget<DatePickerDialog>(
      find.byType(DatePickerDialog),
    );
    expect(picker.initialCalendarMode, DatePickerMode.year);
    expect(picker.firstDate, DateTime(1920));
    expect(picker.lastDate, DateTime(DateTime.now().year - 12, 12, 31));
    expect(find.byType(YearPicker), findsOneWidget);
    expect(find.text('Cancelar'), findsOneWidget);
    expect(find.text('Guardar'), findsOneWidget);
    final dialogContext = tester.element(find.byType(DatePickerDialog));
    expect(MediaQuery.orientationOf(dialogContext), Orientation.portrait);
    final dialog = tester.getRect(find.byType(Dialog));
    final frame = tester.getRect(find.byType(WebMobileFrame));
    expect(dialog.width, lessThanOrEqualTo(390));
    expect(dialog.center.dx, closeTo(frame.center.dx, 1));
    expect(tester.takeException(), isNull);
  });

  testWidgets('should select a Spanish date and preserve it when cancelled', (
    tester,
  ) async {
    await pumpPage(tester);
    await openPicker(tester);
    final year = DateTime.now().year - 25;
    await tester.tap(find.text('$year').last);
    await tester.pumpAndSettle();
    expect(find.text('enero de $year'), findsOneWidget);
    final calendarContext = tester.element(find.byType(CalendarDatePicker));
    final localizations = MaterialLocalizations.of(calendarContext);
    expect(localizations.narrowWeekdays, ['D', 'L', 'M', 'X', 'J', 'V', 'S']);
    await tester.tap(find.text('15').last);
    await tester.tap(find.text('Guardar'));
    await tester.pumpAndSettle();
    expect(find.text('15/01/$year'), findsOneWidget);
    await tester.tap(find.text('15/01/$year'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();
    expect(find.text('15/01/$year'), findsOneWidget);
    expect(tester.takeException(), isNull);

    when(() => profile.patchMyName(any())).thenAnswer((_) async {});
    when(
      () => api.patchPlayerProfileEnvelope(body: any(named: 'body')),
    ).thenAnswer((_) async => {});
    when(() => api.getOnboardingStatusEnvelope()).thenAnswer(
      (_) async => {
        'completedSteps': ['identity'],
        'pendingSteps': [],
        'isComplete': false,
      },
    );
    final phone = tester.widget<PhoneFormField>(find.byType(PhoneFormField));
    phone.controller!.changeNationalNumber('4125551234');
    await tester.ensureVisible(find.text('Continuar'));
    await tester.tap(find.text('Continuar'));
    await tester.pumpAndSettle();
    final body =
        verify(
              () => api.patchPlayerProfileEnvelope(
                body: captureAny(named: 'body'),
              ),
            ).captured.single
            as Map<String, Object?>;
    expect(body['phone'], '+584125551234');
    expect(body['birthYear'], year);
    expect(body['birthDate'], '$year-01-15');
  });
}
