import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_api.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';

class _MockOnboardingApi extends Mock implements OnboardingApi {}

void main() {
  group('OnboardingRepository', () {
    late OnboardingApi api;
    late OnboardingRepository repository;

    setUp(() {
      api = _MockOnboardingApi();
      repository = OnboardingRepository(api: api);
    });

    test(
      'completeOnboarding should call putOnboardingCompleteEnvelope',
      () async {
        when(() => api.putOnboardingCompleteEnvelope()).thenAnswer((_) async {});

        await repository.completeOnboarding();

        verify(() => api.putOnboardingCompleteEnvelope()).called(1);
      },
    );
  });
}
