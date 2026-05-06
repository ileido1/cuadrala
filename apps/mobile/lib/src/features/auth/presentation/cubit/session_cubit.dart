import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../onboarding/data/onboarding_repository.dart';
import '../../data/auth_repository.dart';
import 'session_state.dart';

class SessionCubit extends Cubit<SessionState> {
  SessionCubit({
    required AuthRepository authRepository,
    required OnboardingRepository onboardingRepository,
  })  : _authRepository = authRepository,
        _onboardingRepository = onboardingRepository,
        super(const SessionState.unauthenticated());

  final AuthRepository _authRepository;
  final OnboardingRepository _onboardingRepository;

  Future<void> bootstrap() async {
    emit(const SessionState.loading());
    try {
      await _authRepository.refresh();
      emit(const SessionState.authenticated());
      await _refreshOnboardingFlag();
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

  /// Útil después de login/register: los tokens ya se guardaron en storage.
  Future<void> markAuthenticated() async {
    emit(const SessionState.authenticated());
    await _refreshOnboardingFlag();
  }

  /// Re-consulta el estado de onboarding (útil cuando el usuario completa el último paso).
  Future<void> refreshOnboardingStatus() async {
    if (state is! SessionAuthenticated) return;
    await _refreshOnboardingFlag();
  }

  Future<void> _refreshOnboardingFlag() async {
    try {
      final status = await _onboardingRepository.getStatus();
      emit(SessionState.authenticated(onboardingComplete: status.isComplete));
    } catch (_) {
      // Si falla la consulta, conservamos `null` (UI tratará como unknown).
    }
  }
}
