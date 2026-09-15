import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/theme/app_icons.dart';
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
      phone: _phoneController.text.trim().isEmpty
          ? null
          : _phoneController.text.trim(),
      email: _emailController.text.trim().isEmpty
          ? null
          : _emailController.text.trim(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<
      TournamentRegistrationsCubit,
      TournamentRegistrationsState
    >(
      listener: (context, state) {
        if (!_submitted ||
            state is! TournamentRegistrationsLoaded ||
            state.invitingGuest) {
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
        padding: EdgeInsets.fromLTRB(
          20,
          18,
          20,
          MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child:
            BlocBuilder<
              TournamentRegistrationsCubit,
              TournamentRegistrationsState
            >(
              builder: (context, state) {
                final busy =
                    state is TournamentRegistrationsLoaded &&
                    state.invitingGuest;
                final error = state is TournamentRegistrationsLoaded
                    ? state.guestInviteError
                    : null;

                return Column(
                  key: const Key('tournament.inviteGuestSheet'),
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.outline,
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                    Text(
                      'Invitar huésped',
                      key: const Key('tournament.inviteGuestSheet.title'),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Alguien sin cuenta en la app',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      key: const Key('tournament.inviteGuestSheet.name'),
                      controller: _nameController,
                      decoration: const InputDecoration(
                        hintText: 'Nombre y apellido *',
                      ),
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      key: const Key('tournament.inviteGuestSheet.phone'),
                      controller: _phoneController,
                      decoration: const InputDecoration(
                        hintText: 'Teléfono (opcional) +58…',
                      ),
                      keyboardType: TextInputType.phone,
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      key: const Key('tournament.inviteGuestSheet.email'),
                      controller: _emailController,
                      decoration: const InputDecoration(
                        hintText: 'Email (opcional)',
                      ),
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.done,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Entra como pendiente igual que el resto. Los huéspedes no entran al cuadro de eliminación.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        height: 1.45,
                      ),
                    ),
                    if (error != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        error,
                        key: const Key('tournament.inviteGuestSheet.error'),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ],
                    const SizedBox(height: 18),
                    FilledButton.icon(
                      key: const Key('tournament.inviteGuestSheet.submit'),
                      onPressed: busy ? null : () => _submitSV(context),
                      icon: busy
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(AppIcons.personAdd),
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
  final scheme = Theme.of(context).colorScheme;
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: scheme.surfaceContainerLow,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (sheetContext) =>
        BlocProvider.value(value: cubit, child: const InviteGuestSheet()),
  );
}

/// Bottom sheet for inviting an authenticated player. The API currently
/// accepts a user id, so the typed value is kept as the only result instead of
/// fabricating a player directory in the client.
final class InvitePlayerSheet extends StatefulWidget {
  const InvitePlayerSheet({super.key});

  @override
  State<InvitePlayerSheet> createState() => _InvitePlayerSheetState();
}

final class _InvitePlayerSheetState extends State<InvitePlayerSheet> {
  final _userIdController = TextEditingController();
  bool _submitted = false;

  @override
  void dispose() {
    _userIdController.dispose();
    super.dispose();
  }

  void _submit(BuildContext context) {
    final userId = _userIdController.text.trim();
    if (userId.isEmpty) return;

    setState(() => _submitted = true);
    context.read<TournamentRegistrationsCubit>().invite(userId);
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<
      TournamentRegistrationsCubit,
      TournamentRegistrationsState
    >(
      listener: (context, state) {
        if (!_submitted ||
            state is! TournamentRegistrationsLoaded ||
            state.inviting) {
          return;
        }
        if (state.invitationError == null) {
          Navigator.of(context).maybePop();
        } else {
          _submitted = false;
        }
      },
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
          child:
              BlocBuilder<
                TournamentRegistrationsCubit,
                TournamentRegistrationsState
              >(
                builder: (context, state) {
                  final loaded = state is TournamentRegistrationsLoaded
                      ? state
                      : null;
                  final busy = loaded?.inviting ?? false;
                  final error = loaded?.invitationError;
                  final query = _userIdController.text.trim();

                  return Column(
                    key: const Key('tournament.invitePlayerSheet'),
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _InviteSheetHandle(),
                      Text(
                        'Invitar jugador',
                        key: const Key('tournament.invitePlayerSheet.title'),
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Le llega y decide él',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        key: const Key('tournament.invitePlayerSheet.search'),
                        controller: _userIdController,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                          prefixIcon: Icon(AppIcons.search, size: 19),
                          hintText: 'Buscar por nombre o handle',
                        ),
                        textInputAction: TextInputAction.done,
                        onSubmitted: busy ? null : (_) => _submit(context),
                      ),
                      if (query.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Container(
                          key: const Key('tournament.invitePlayerSheet.result'),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: Theme.of(
                                context,
                              ).colorScheme.outlineVariant,
                              width: 1.5,
                            ),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 17,
                                backgroundColor: Theme.of(
                                  context,
                                ).colorScheme.primaryContainer,
                                child: Text(
                                  query.substring(0, 1).toUpperCase(),
                                  style: TextStyle(
                                    color: Theme.of(
                                      context,
                                    ).colorScheme.onPrimaryContainer,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  query,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              Text(
                                'ID disponible',
                                style: Theme.of(context).textTheme.labelSmall
                                    ?.copyWith(
                                      color: Theme.of(
                                        context,
                                      ).colorScheme.onSurfaceVariant,
                                    ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      if (error != null) ...[
                        const SizedBox(height: 10),
                        Text(
                          error,
                          key: const Key('tournament.invitePlayerSheet.error'),
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          ),
                        ),
                      ],
                      const SizedBox(height: 18),
                      FilledButton.icon(
                        key: const Key('tournament.invitePlayerSheet.submit'),
                        onPressed: busy || query.isEmpty
                            ? null
                            : () => _submit(context),
                        icon: busy
                            ? const SizedBox(
                                width: 17,
                                height: 17,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(AppIcons.check, size: 19),
                        label: const Text('Invitar'),
                      ),
                    ],
                  );
                },
              ),
        ),
      ),
    );
  }
}

final class _InviteSheetHandle extends StatelessWidget {
  const _InviteSheetHandle();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 40,
        height: 4,
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.outline,
          borderRadius: BorderRadius.circular(999),
        ),
      ),
    );
  }
}

Future<void> showInvitePlayerSheet(BuildContext context) {
  final cubit = context.read<TournamentRegistrationsCubit>();
  final scheme = Theme.of(context).colorScheme;
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: scheme.surfaceContainerLow,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (sheetContext) =>
        BlocProvider.value(value: cubit, child: const InvitePlayerSheet()),
  );
}
