import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/quick_match_repository.dart';
import 'quick_match_state.dart';

final class QuickMatchCubit extends Cubit<QuickMatchState> {
  QuickMatchCubit({required QuickMatchRepository repository})
    : _repository = repository,
      super(const QuickMatchInitial());
  final QuickMatchRepository _repository;
  Future<void> load() async {
    emit(const QuickMatchLoading());
    try {
      final search = await _repository.current();
      emit(search == null ? const QuickMatchIdle() : QuickMatchActive(search));
    } catch (_) {
      emit(const QuickMatchFailure('No pudimos cargar tu búsqueda.'));
    }
  }

  Future<void> start(Map<String, Object?> preferences) async {
    emit(const QuickMatchLoading());
    try {
      emit(QuickMatchActive(await _repository.start(preferences)));
    } catch (_) {
      emit(const QuickMatchFailure('No pudimos iniciar la búsqueda.'));
    }
  }

  Future<void> cancel() async {
    await _repository.cancel();
    emit(const QuickMatchIdle());
  }
}
