import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/auth_repository.dart';
import '../../data/models/login_request.dart';
import 'login_state.dart';

class LoginCubit extends Cubit<LoginState> {
  LoginCubit({required AuthRepository authRepository})
      : _authRepository = authRepository,
        super(const LoginState.idle());

  final AuthRepository _authRepository;

  Future<void> submit(LoginRequest request) async {
    emit(const LoginState.loading());
    try {
      await _authRepository.login(request);
      emit(const LoginState.success());
    } catch (e) {
      final message = e is AppFailure
          ? e.message
          : 'No se pudo iniciar sesión. Inténtalo de nuevo.';
      emit(LoginState.failure(message: message));
    }
  }
}
