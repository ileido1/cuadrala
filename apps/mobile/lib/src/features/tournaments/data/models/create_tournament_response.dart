import 'package:equatable/equatable.dart';

final class CreateTournamentResponse extends Equatable {
  const CreateTournamentResponse({required this.id});

  final String id;

  factory CreateTournamentResponse.fromJson(Map<String, Object?> json) {
    return CreateTournamentResponse(id: (json['id'] ?? '').toString());
  }

  @override
  List<Object?> get props => [id];
}

