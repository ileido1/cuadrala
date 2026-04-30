import 'package:equatable/equatable.dart';

final class AppFailure extends Equatable implements Exception {
  const AppFailure({required this.code, required this.message, this.details});

  final String code;
  final String message;
  final Object? details;

  @override
  List<Object?> get props => [code, message, details];
}
