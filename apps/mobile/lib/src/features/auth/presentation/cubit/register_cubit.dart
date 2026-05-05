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
      if (e is AppFailure) {
        emit(
          RegisterState.failure(
            message: e.message,
            fieldErrors: _extractFieldErrors(e),
          ),
        );
        return;
      }
      emit(
        const RegisterState.failure(
          message: 'No se pudo crear la cuenta. Inténtalo de nuevo.',
        ),
      );
    }
  }

  RegisterFieldErrors? _extractFieldErrors(AppFailure failure) {
    if (failure.code != 'VALIDACION_FALLIDA') return null;
    final details = failure.details;
    if (details is! Map) return null;
    final fieldErrorsRaw = details['fieldErrors'];
    if (fieldErrorsRaw is! Map) return null;

    String? firstStringOrNull(Object? value) {
      if (value is List && value.isNotEmpty && value.first is String) {
        return value.first as String;
      }
      return null;
    }

    final email = firstStringOrNull(fieldErrorsRaw['email']);
    final password = firstStringOrNull(fieldErrorsRaw['password']);
    final name = firstStringOrNull(fieldErrorsRaw['name']);

    final result = RegisterFieldErrors(email: email, password: password, name: name);
    return result.isEmpty ? null : result;
  }
}
