import 'package:equatable/equatable.dart';

final class SetScore extends Equatable {
  const SetScore({required this.teamA, required this.teamB});

  final int teamA;
  final int teamB;

  @override
  List<Object?> get props => [teamA, teamB];
}
