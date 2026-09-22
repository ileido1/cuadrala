import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/location/location_service.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/cubit/onboarding_cubit.dart';
import 'package:cuadrala_mobile/src/features/onboarding/presentation/pages/location_page.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';

class _MockOnboardingRepository extends Mock implements OnboardingRepository {}

class _MockProfileRepository extends Mock implements ProfileRepository {}

class _MockLocationService extends Mock implements LocationService {}

void main() {
  late OnboardingCubit cubit;
  late LocationService locationService;

  setUp(() {
    locationService = _MockLocationService();
    cubit = OnboardingCubit(
      repository: _MockOnboardingRepository(),
      profileRepository: _MockProfileRepository(),
      locationService: locationService,
    );
  });

  tearDown(() => cubit.close());

  Future<void> pumpPage(WidgetTester tester, {bool isActive = true}) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BlocProvider<OnboardingCubit>.value(
            value: cubit,
            child: OnboardingLocationPage(
              onContinue: () {},
              isActive: isActive,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets(
    'requests location on entry and autofills coordinate fields when granted',
    (tester) async {
      when(() => locationService.getCurrentLocation()).thenAnswer(
        (_) async =>
            const DeviceLocation(latitude: 10.491234, longitude: -66.876543),
      );

      await pumpPage(tester);

      verify(() => locationService.getCurrentLocation()).called(1);
      await tester.tap(find.byType(Switch));
      await tester.pump();

      final latitude = tester.widget<TextField>(
        find.byKey(const Key('onboarding.location.latitude')),
      );
      final longitude = tester.widget<TextField>(
        find.byKey(const Key('onboarding.location.longitude')),
      );
      expect(latitude.controller?.text, '10.491234');
      expect(longitude.controller?.text, '-66.876543');
    },
  );

  testWidgets(
    'requests and autofills only when the location step becomes active',
    (tester) async {
      when(() => locationService.getCurrentLocation()).thenAnswer(
        (_) async =>
            const DeviceLocation(latitude: 10.500001, longitude: -66.900001),
      );

      await pumpPage(tester, isActive: false);
      verifyNever(() => locationService.getCurrentLocation());

      await pumpPage(tester);

      verify(() => locationService.getCurrentLocation()).called(1);
      await tester.tap(find.byType(Switch));
      await tester.pump();

      final latitude = tester.widget<TextField>(
        find.byKey(const Key('onboarding.location.latitude')),
      );
      final longitude = tester.widget<TextField>(
        find.byKey(const Key('onboarding.location.longitude')),
      );
      expect(latitude.controller?.text, '10.500001');
      expect(longitude.controller?.text, '-66.900001');
    },
  );

  testWidgets('preserves manually edited coordinates after a denied retry', (
    tester,
  ) async {
    when(() => locationService.getCurrentLocation()).thenThrow(
      const LocationFailure(
        code: 'LOCATION_DENIED',
        message: 'Permiso denegado. Ingresa tu ubicación manualmente.',
      ),
    );

    await pumpPage(tester);

    await tester.tap(find.byType(Switch));
    await tester.pump();
    final latitudeFinder = find.byKey(
      const Key('onboarding.location.latitude'),
    );
    final longitudeFinder = find.byKey(
      const Key('onboarding.location.longitude'),
    );
    await tester.enterText(latitudeFinder, '8.123456');
    await tester.enterText(longitudeFinder, '-71.654321');

    await cubit.detectLocation(retry: true);
    await tester.pumpAndSettle();

    final latitude = tester.widget<TextField>(latitudeFinder);
    final longitude = tester.widget<TextField>(longitudeFinder);
    expect(latitude.controller?.text, '8.123456');
    expect(longitude.controller?.text, '-71.654321');

    verify(() => locationService.getCurrentLocation()).called(2);
    expect(tester.takeException(), isNull);
  });
}
