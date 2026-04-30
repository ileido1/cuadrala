import 'package:equatable/equatable.dart';

final class RegisterRequest extends Equatable {
  const RegisterRequest({
    required this.email,
    required this.password,
    required this.name,
  });

  final String email;
  final String password;
  final String name;

  Map<String, Object?> toJson() => {
        'email': email,
        'password': password,
        'name': name,
      };

  @override
  List<Object?> get props => [email, password, name];
}
