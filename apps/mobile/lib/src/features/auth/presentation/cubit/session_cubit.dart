import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/auth_repository.dart';
import 'session_state.dart';

class SessionCubit extends Cubit<SessionState> {
  SessionCubit({required AuthRepository authRepository})
      : _authRepository = authRepository,
        super(const SessionState.unauthenticated());

  final AuthRepository _authRepository;

  Future<void> bootstrap() async {
    emit(const SessionState.loading());
    try {
      await _authRepository.refresh();
      emit(const SessionState.authenticated());
    } catch (_) {
      await _authRepository.logout();
      emit(const SessionState.unauthenticated(reason: 'Sesión expirada'));
    }
  }

  Future<void> logout() async {
    emit(const SessionState.loading());
    await _authRepository.logout();
    emit(const SessionState.unauthenticated());
  }
}
