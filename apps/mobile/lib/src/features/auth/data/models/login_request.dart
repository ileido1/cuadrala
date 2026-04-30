import 'package:equatable/equatable.dart';

final class LoginRequest extends Equatable {
  const LoginRequest({required this.email, required this.password});

  final String email;
  final String password;

  Map<String, Object?> toJson() => {
        'email': email,
        'password': password,
      };

  @override
  List<Object?> get props => [email, password];
}
