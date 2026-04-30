import 'package:equatable/equatable.dart';

sealed class RegisterState extends Equatable {
  const RegisterState();

  const factory RegisterState.idle() = RegisterIdle;
  const factory RegisterState.loading() = RegisterLoading;
  const factory RegisterState.success() = RegisterSuccess;
  const factory RegisterState.failure({required String message}) =
      RegisterFailure;
}

final class RegisterIdle extends RegisterState {
  const RegisterIdle();

  @override
  List<Object?> get props => [];
}

final class RegisterLoading extends RegisterState {
  const RegisterLoading();

  @override
  List<Object?> get props => [];
}

final class RegisterSuccess extends RegisterState {
  const RegisterSuccess();

  @override
  List<Object?> get props => [];
}

final class RegisterFailure extends RegisterState {
  const RegisterFailure({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}
