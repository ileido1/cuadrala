import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/auth_repository.dart';
import '../../data/models/register_request.dart';
import 'register_state.dart';

class RegisterCubit extends Cubit<RegisterState> {
  RegisterCubit({required AuthRepository authRepository})
      : _authRepository = authRepository,
        super(const RegisterState.idle());

  final AuthRepository _authRepository;

  Future<void> submit(RegisterRequest request) async {
    emit(const RegisterState.loading());
    try {
      await _authRepository.register(request);
      emit(const RegisterState.success());
    } catch (e) {
      final message = e is AppFailure
          ? e.message
          : 'No se pudo crear la cuenta. Inténtalo de nuevo.';
      emit(RegisterState.failure(message: message));
    }
  }
}
