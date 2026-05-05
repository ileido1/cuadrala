import 'package:equatable/equatable.dart';

sealed class RegisterState extends Equatable {
  const RegisterState();

  const factory RegisterState.idle() = RegisterIdle;
  const factory RegisterState.loading() = RegisterLoading;
  const factory RegisterState.success() = RegisterSuccess;
  const factory RegisterState.failure({
    required String message,
    RegisterFieldErrors? fieldErrors,
  }) = RegisterFailure;
}

final class RegisterFieldErrors extends Equatable {
  const RegisterFieldErrors({this.email, this.password, this.name});

  final String? email;
  final String? password;
  final String? name;

  bool get isEmpty => email == null && password == null && name == null;

  @override
  List<Object?> get props => [email, password, name];
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
  const RegisterFailure({required this.message, this.fieldErrors});

  final String message;
  final RegisterFieldErrors? fieldErrors;

  @override
  List<Object?> get props => [message, fieldErrors];
}
