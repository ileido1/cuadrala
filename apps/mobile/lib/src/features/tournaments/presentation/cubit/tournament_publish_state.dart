import 'package:equatable/equatable.dart';

final class TournamentPublishState extends Equatable {
  const TournamentPublishState({
    required this.status,
    required this.visibility,
    this.submitting = false,
    this.error,
    this.settings,
  });

  final String status;
  final String visibility;
  final bool submitting;
  final String? error;
  final Map<String, Object?>? settings;

  TournamentPublishState copyWith({
    String? status,
    String? visibility,
    bool? submitting,
    String? error,
    bool clearError = false,
    Map<String, Object?>? settings,
  }) {
    return TournamentPublishState(
      status: status ?? this.status,
      visibility: visibility ?? this.visibility,
      submitting: submitting ?? this.submitting,
      error: clearError ? null : error ?? this.error,
      settings: settings ?? this.settings,
    );
  }

  @override
  List<Object?> get props => [status, visibility, submitting, error, settings];
}
