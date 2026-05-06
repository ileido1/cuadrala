enum OnboardingStep { identity, sports, sportProfiles, location, availability }

OnboardingStep _parseStep(String raw) {
  switch (raw) {
    case 'identity':
      return OnboardingStep.identity;
    case 'sports':
      return OnboardingStep.sports;
    case 'sport_profiles':
      return OnboardingStep.sportProfiles;
    case 'location':
      return OnboardingStep.location;
    case 'availability':
      return OnboardingStep.availability;
  }
  throw FormatException('Unknown onboarding step: $raw');
}

final class OnboardingStatusDto {
  const OnboardingStatusDto({
    required this.completedSteps,
    required this.pendingSteps,
    required this.isComplete,
    required this.completedAt,
  });

  final List<OnboardingStep> completedSteps;
  final List<OnboardingStep> pendingSteps;
  final bool isComplete;
  final DateTime? completedAt;

  static OnboardingStatusDto fromJson(Map<String, Object?> json) {
    final completed = (json['completedSteps'] as List?)
            ?.cast<String>()
            .map(_parseStep)
            .toList(growable: false) ??
        const [];
    final pending = (json['pendingSteps'] as List?)
            ?.cast<String>()
            .map(_parseStep)
            .toList(growable: false) ??
        const [];
    final completedAtRaw = json['completedAt'];
    return OnboardingStatusDto(
      completedSteps: completed,
      pendingSteps: pending,
      isComplete: (json['isComplete'] as bool?) ?? false,
      completedAt: completedAtRaw is String ? DateTime.tryParse(completedAtRaw) : null,
    );
  }
}
