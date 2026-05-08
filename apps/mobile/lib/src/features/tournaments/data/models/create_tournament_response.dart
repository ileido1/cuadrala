import 'package:equatable/equatable.dart';

final class CreateTournamentResponse extends Equatable {
  const CreateTournamentResponse({required this.tournamentId});

  final String tournamentId;

  factory CreateTournamentResponse.fromJson(Map<String, Object?> json) {
    return CreateTournamentResponse(
      tournamentId: (json['tournamentId'] ?? json['id'] ?? '').toString(),
    );
  }

  @override
  List<Object?> get props => [tournamentId];
}

