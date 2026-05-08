import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/venues_repository.dart';
import 'venue_detail_state.dart';

final class VenueDetailCubit extends Cubit<VenueDetailState> {
  VenueDetailCubit({
    required VenuesRepository repository,
    required String venueId,
  })  : _repository = repository,
        _venueId = venueId,
        super(const VenueDetailInitial());

  final VenuesRepository _repository;
  final String _venueId;

  Future<void> load() async {
    emit(const VenueDetailLoading());
    try {
      final courts = await _repository.listVenueCourts(venueId: _venueId);
      emit(VenueDetailLoaded(courts: courts));
    } on AppFailure catch (e) {
      emit(VenueDetailFailure(message: e.message));
    } catch (_) {
      emit(const VenueDetailFailure(message: 'No se pudieron cargar las canchas.'));
    }
  }
}
