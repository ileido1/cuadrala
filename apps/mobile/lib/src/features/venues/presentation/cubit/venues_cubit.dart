import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/venues_repository.dart';
import 'venues_state.dart';

final class VenuesCubit extends Cubit<VenuesState> {
  VenuesCubit({required VenuesRepository repository})
      : _repository = repository,
        super(const VenuesInitial());

  final VenuesRepository _repository;

  Future<void> load({String? near, int? radiusKm}) async {
    emit(const VenuesLoading());
    try {
      final venues = await _repository.listVenues(near: near, radiusKm: radiusKm);
      emit(VenuesLoaded(venues: venues));
    } on AppFailure catch (e) {
      emit(VenuesFailure(message: e.message));
    } catch (_) {
      emit(const VenuesFailure(message: 'No se pudieron cargar las sedes.'));
    }
  }
}
