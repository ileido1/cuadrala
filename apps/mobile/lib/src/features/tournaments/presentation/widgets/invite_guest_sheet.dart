import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../cubit/tournament_registrations_cubit.dart';
import '../cubit/tournament_registrations_state.dart';

/// Organizer-only bottom sheet to invite a guest (a player without a `User`
/// account) to the tournament — Slice 1: tournament-guest-registration.
///
/// Submits via [TournamentRegistrationsCubit.inviteGuest] and closes itself
/// once that call resolves without a new error; an error keeps the sheet
/// open so the organizer can correct the input and retry.
final class InviteGuestSheet extends StatefulWidget {
  const InviteGuestSheet({super.key});

  @override
  State<InviteGuestSheet> createState() => _InviteGuestSheetState();
}

final class _InviteGuestSheetState extends State<InviteGuestSheet> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  bool _submitted = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _submitSV(BuildContext context) {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;

    setState(() => _submitted = true);
    context.read<TournamentRegistrationsCubit>().inviteGuest(
          name: name,
          phone: _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
          email: _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<TournamentRegistrationsCubit, TournamentRegistrationsState>(
      listener: (context, state) {
        if (!_submitted || state is! TournamentRegistrationsLoaded || state.invitingGuest) {
          return;
        }
        if (state.guestInviteError == null) {
          Navigator.of(context).maybePop();
        } else {
          // Keep the sheet open on failure; allow the next successful
          // submit to trigger the pop again.
          _submitted = false;
        }
      },
      child: Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 16,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        ),
        child: BlocBuilder<TournamentRegistrationsCubit, TournamentRegistrationsState>(
          builder: (context, state) {
            final busy = state is TournamentRegistrationsLoaded && state.invitingGuest;
            final error =
                state is TournamentRegistrationsLoaded ? state.guestInviteError : null;

            return Column(
              key: const Key('tournament.inviteGuestSheet'),
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Invitar huésped',
                  style:
                      Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 12),
                TextField(
                  key: const Key('tournament.inviteGuestSheet.name'),
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Nombre *', isDense: true),
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 8),
                TextField(
                  key: const Key('tournament.inviteGuestSheet.phone'),
                  controller: _phoneController,
                  decoration: const InputDecoration(labelText: 'Teléfono', isDense: true),
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 8),
                TextField(
                  key: const Key('tournament.inviteGuestSheet.email'),
                  controller: _emailController,
                  decoration: const InputDecoration(labelText: 'Email', isDense: true),
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.done,
                ),
                if (error != null) ...[
                  const SizedBox(height: 8),
                  Text(error, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ],
                const SizedBox(height: 16),
                FilledButton.icon(
                  key: const Key('tournament.inviteGuestSheet.submit'),
                  onPressed: busy ? null : () => _submitSV(context),
                  icon: busy
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.person_add_alt_1),
                  label: const Text('Invitar'),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

/// Opens [InviteGuestSheet] as a modal bottom sheet, reusing the
/// [TournamentRegistrationsCubit] already provided above [context].
Future<void> showInviteGuestSheet(BuildContext context) {
  final cubit = context.read<TournamentRegistrationsCubit>();
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (sheetContext) => BlocProvider.value(
      value: cubit,
      child: const InviteGuestSheet(),
    ),
  );
}
