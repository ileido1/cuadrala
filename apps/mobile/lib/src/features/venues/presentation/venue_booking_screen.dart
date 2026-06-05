import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import 'cubit/venue_booking_cubit.dart';
import 'venue_booking_form.dart';

// ---------------------------------------------------------------------------
// VenueBookingScreen
//
// Full-screen booking wrapper used by deep-link routes.
// VenueBookingCubit is provided at the route level (app_router.dart).
// ---------------------------------------------------------------------------

final class VenueBookingScreen extends StatelessWidget {
  const VenueBookingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final venueName = context.read<VenueBookingCubit>().state.venue.name;
    return Scaffold(
      appBar: AppBar(title: Text(venueName)),
      body: VenueBookingForm(
        onMatchCreated: (matchId) => context.go('/matches/$matchId'),
      ),
    );
  }
}
