import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/service_locator.dart';
import '../data/backoffice_reservations_repository.dart';
import 'cubit/backoffice_reservations_cubit.dart';
import 'cubit/backoffice_reservations_state.dart';
import 'widgets/weekly_calendar.dart';
import 'widgets/booking_detail_sheet.dart';
import 'widgets/reservation_modal.dart';
import '../data/models/booking_item.dart';

final class BackofficeScheduleScreen extends StatelessWidget {
  const BackofficeScheduleScreen({super.key, required this.venueId, required this.venueName});

  final String venueId;
  final String venueName;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => BackofficeReservationsCubit(
        repository: getIt<BackofficeReservationsRepository>(),
        venueId: venueId,
      )..load(),
      child: _BackofficeScheduleView(venueId: venueId, venueName: venueName),
    );
  }
}

final class _BackofficeScheduleView extends StatelessWidget {
  const _BackofficeScheduleView({required this.venueId, required this.venueName});

  final String venueId;
  final String venueName;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('backoffice.schedule'),
      appBar: AppBar(
        title: Text(venueName),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: BlocConsumer<BackofficeReservationsCubit, BackofficeReservationsState>(
        listener: (context, state) {
          if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.error!),
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
            );
          }
        },
        builder: (context, state) {
           if (state.status == BackofficeReservationsStatus.loading &&
              state.bookings.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.status == BackofficeReservationsStatus.failure &&
              state.bookings.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(state.error ?? 'Error al cargar'),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => context.read<BackofficeReservationsCubit>().load(),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }
          return WeeklyCalendar(
            state: state,
            onPreviousWeek: () => context.read<BackofficeReservationsCubit>().goToPreviousWeek(),
            onNextWeek: () => context.read<BackofficeReservationsCubit>().goToNextWeek(),
            onSlotTap: (courtId, date, startTime) => _showCreateReservationModal(
              context,
              venueId,
              courtId,
              date,
              startTime,
            ),
            onReservationTap: (reservation) => _showReservationModal(context, reservation),
          );
        },
      ),
    );
  }

  void _showCreateReservationModal(
    BuildContext context,
    String venueId,
    String? courtId,
    DateTime date,
    String startTime,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => BlocProvider.value(
        value: context.read<BackofficeReservationsCubit>(),
        child: ReservationModal(
          venueId: venueId,
          initialCourtId: courtId,
          initialDate: date,
          initialStartTime: startTime,
        ),
      ),
    );
  }

  void _showReservationModal(BuildContext context, BookingItem booking) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => BookingDetailSheet(
        booking: booking,
        venueId: venueId,
        venueName: venueName,
        onPaymentConfirmed: () =>
            context.read<BackofficeReservationsCubit>().load(),
      ),
    );
  }
}