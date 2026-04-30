import 'package:equatable/equatable.dart';

sealed class LoginState extends Equatable {
  const LoginState();

  const factory LoginState.idle() = LoginIdle;
  const factory LoginState.loading() = LoginLoading;
  const factory LoginState.success() = LoginSuccess;
  const factory LoginState.failure({required String message}) = LoginFailure;
}

final class LoginIdle extends LoginState {
  const LoginIdle();

  @override
  List<Object?> get props => [];
}

final class LoginLoading extends LoginState {
  const LoginLoading();

  @override
  List<Object?> get props => [];
}

final class LoginSuccess extends LoginState {
  const LoginSuccess();

  @override
  List<Object?> get props => [];
}

final class LoginFailure extends LoginState {
  const LoginFailure({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}
