import 'package:equatable/equatable.dart';

final class CreateTournamentRequest extends Equatable {
  const CreateTournamentRequest({
    required this.sportId,
    required this.categoryId,
    required this.name,
    required this.formatPresetId,
    this.formatParameters,
    this.startsAt,
    this.venueId,
    this.gender,
    this.pairedRegistration = false,
    this.inscriptionPrice,
    this.maxSlots,
    this.visibility = 'PUBLIC',
    this.publishOnCreate = false,
  });

  final String sportId;
  final String categoryId;
  final String name;
  final String formatPresetId;
  final Map<String, Object?>? formatParameters;
  final DateTime? startsAt;
  final String? venueId;
  final String? gender;
  final bool pairedRegistration;
  final int? inscriptionPrice;
  final int? maxSlots;

  /// `PUBLIC` (aparece en el catálogo) o `PRIVATE` (solo por link).
  final String visibility;

  /// Determines whether the newly created draft must be opened immediately.
  final bool publishOnCreate;

  Map<String, Object?> toJson() => {
    'sportId': sportId,
    'categoryId': categoryId,
    'name': name,
    'formatPresetId': formatPresetId,
    'visibility': visibility,
    if (formatParameters != null) 'formatParameters': formatParameters,
    if (startsAt != null) 'startsAt': startsAt!.toIso8601String(),
    if (venueId != null) 'venueId': venueId,
    if (gender != null) 'gender': gender,
    'pairedRegistration': pairedRegistration,
    if (inscriptionPrice != null) 'inscriptionPrice': inscriptionPrice,
    if (maxSlots != null) 'maxSlots': maxSlots,
  };

  @override
  List<Object?> get props => [
    sportId,
    categoryId,
    name,
    formatPresetId,
    formatParameters,
    startsAt,
    venueId,
    gender,
    pairedRegistration,
    inscriptionPrice,
    maxSlots,
    visibility,
    publishOnCreate,
  ];
}
