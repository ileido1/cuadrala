import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/failures/app_failure.dart';
import '../venues/data/models/court_dto.dart';
import '../venues/data/venues_repository.dart';
import 'venue_detail_state.dart';

final class VenueDetailCubit extends Cubit<VenueDetailState> {
  VenueDetailCubit({
    required VenuesRepository venuesRepository,
    required String venueId,
  })  : _venuesRepository = venuesRepository,
        _venueId = venueId,
        super(const VenueDetailInitial());

  final VenuesRepository _venuesRepository;
  final String _venueId;

  Future<void> load() async {
    emit(const VenueDetailLoading());
    try {
      final results = await Future.wait([
        _venuesRepository.getVenueDetail(venueId: _venueId),
        _venuesRepository.listVenueCourts(venueId: _venueId),
      ]);

      final venue = results[0] as dynamic;
      final courts = results[1] as dynamic;

      if (venue == null) {
        emit(const VenueDetailEmpty());
        return;
      }

      emit(VenueDetailLoaded(venue: venue, courts: courts as List<CourtDto>));
    } on AppFailure catch (e) {
      emit(VenueDetailError(message: e.message));
    } catch (_) {
      emit(const VenueDetailError(message: 'No se pudo cargar la sede.'));
    }
  }
}
