import 'package:equatable/equatable.dart';

final class CreateTournamentRequest extends Equatable {
  const CreateTournamentRequest({
    required this.sportId,
    required this.categoryId,
    required this.name,
    required this.formatPresetId,
    this.formatParameters,
    this.startsAt,
  });

  final String sportId;
  final String categoryId;
  final String name;
  final String formatPresetId;
  final Map<String, Object?>? formatParameters;
  final DateTime? startsAt;

  Map<String, Object?> toJson() => {
        'sportId': sportId,
        'categoryId': categoryId,
        'name': name,
        'formatPresetId': formatPresetId,
        if (formatParameters != null) 'formatParameters': formatParameters,
        if (startsAt != null) 'startsAt': startsAt!.toIso8601String(),
      };

  @override
  List<Object?> get props => [sportId, categoryId, name, formatPresetId, formatParameters, startsAt];
}

