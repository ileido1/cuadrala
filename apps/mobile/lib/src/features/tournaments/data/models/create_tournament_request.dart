import 'package:equatable/equatable.dart';

final class CreateTournamentRequest extends Equatable {
  const CreateTournamentRequest({
    required this.sportId,
    required this.name,
    required this.bracketSize,
  });

  final String sportId;
  final String name;
  final int bracketSize;

  Map<String, Object?> toJson() => {
        'sportId': sportId,
        'name': name,
        'bracketSize': bracketSize,
      };

  @override
  List<Object?> get props => [sportId, name, bracketSize];
}

