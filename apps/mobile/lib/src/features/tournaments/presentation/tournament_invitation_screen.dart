import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/brand_colors.dart';
import '../data/models/tournament_invitation_dto.dart';
import '../data/models/tournament_list_item_dto.dart';
import 'cubit/tournament_registrations_cubit.dart';
import 'cubit/tournament_registrations_state.dart';
import 'widgets/tournament_entry_check.dart';

/// Full-screen player view for an invitation that is already available in the
/// registrations cubit. It deliberately does not fetch invitation data by
/// itself because the current API read path is organizer-gated.
final class TournamentInvitationScreen extends StatelessWidget {
  const TournamentInvitationScreen({
    super.key,
    required this.tournament,
    required this.invitation,
  });

  final TournamentListItemDto tournament;
  final TournamentInvitationDto invitation;

  @override
  Widget build(BuildContext context) {
    return TournamentInvitationBody(
      tournament: tournament,
      invitation: invitation,
    );
  }
}

@visibleForTesting
final class TournamentInvitationBody extends StatefulWidget {
  const TournamentInvitationBody({
    super.key,
    required this.tournament,
    required this.invitation,
  });

  final TournamentListItemDto tournament;
  final TournamentInvitationDto invitation;

  @override
  State<TournamentInvitationBody> createState() =>
      _TournamentInvitationBodyState();
}

final class _TournamentInvitationBodyState
    extends State<TournamentInvitationBody> {
  bool _responding = false;

  Future<void> _respond(bool accept) async {
    final cubit = context.read<TournamentRegistrationsCubit>();
    setState(() => _responding = true);
    if (accept) {
      await cubit.acceptInvitation(widget.invitation.id);
    } else {
      await cubit.rejectInvitation(widget.invitation.id);
    }
    if (!mounted) return;
    final state = cubit.state;
    if (state is TournamentRegistrationsLoaded &&
        state.invitationError != null) {
      setState(() => _responding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return BlocListener<
      TournamentRegistrationsCubit,
      TournamentRegistrationsState
    >(
      listener: (context, state) {
        if (!_responding ||
            state is! TournamentRegistrationsLoaded ||
            state.responding) {
          return;
        }
        if (state.invitationError == null) {
          Navigator.of(context).maybePop();
        } else {
          setState(() => _responding = false);
        }
      },
      child: Scaffold(
        backgroundColor: scheme.surfaceContainerLowest,
        appBar: AppBar(
          leading: IconButton(
            tooltip: 'Cerrar',
            onPressed: () => Navigator.of(context).maybePop(),
            icon: const Icon(Icons.close),
          ),
          title: const Text('Invitación'),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 130),
          children: [
            _InvitationBanner(tournament: widget.tournament),
            const SizedBox(height: 16),
            Text(
              widget.tournament.name,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            TournamentEntryCheck(
              eligibility: TournamentEligibility.invited,
              categoryName: widget.tournament.categoryName,
              inscriptionPrice: widget.tournament.inscriptionPrice,
              startsAt: widget.tournament.startsAt,
              registrationClosesAt: widget.tournament.registrationClosesAt,
              venueName: widget.tournament.venueName,
            ),
          ],
        ),
        bottomNavigationBar: Container(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          decoration: BoxDecoration(
            color: scheme.surfaceContainerLow,
            border: Border(top: BorderSide(color: scheme.outlineVariant)),
          ),
          child: SafeArea(
            top: false,
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _responding ? null : () => _respond(false),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(0, 54),
                    ),
                    child: const Text('Rechazar'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _responding ? null : () => _respond(true),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(0, 54),
                    ),
                    icon: _responding
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.check, size: 19),
                    label: const Text('Aceptar'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

final class _InvitationBanner extends StatelessWidget {
  const _InvitationBanner({required this.tournament});

  final TournamentListItemDto tournament;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: BrandColors.limeAccent.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: BrandColors.limeAccent.withValues(alpha: 0.45),
          width: 1.5,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: BrandColors.limeAccent,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.mail_outline, color: scheme.onSurface, size: 19),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${tournament.name} te invitó',
                  style: const TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Si aceptás quedás inscripto directo, sin esperar confirmación.',
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 13,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
