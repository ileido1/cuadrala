import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/brand_colors.dart';
import '../data/models/tournament_list_item_dto.dart';
import 'cubit/tournament_registrations_cubit.dart';
import 'cubit/tournament_registrations_state.dart';
import 'widgets/tournament_entry_check.dart';

/// Full-screen invitee view. It uses the invitation ID returned by the
/// player's ViewerTournamentDto; the invitation-list endpoint is organizer-only.
final class TournamentInvitationScreen extends StatelessWidget {
  const TournamentInvitationScreen({
    super.key,
    required this.tournament,
    required this.invitationId,
  });

  final TournamentListItemDto tournament;
  final String invitationId;

  @override
  Widget build(BuildContext context) {
    return TournamentInvitationBody(
      tournament: tournament,
      invitationId: invitationId,
    );
  }
}

@visibleForTesting
final class TournamentInvitationBody extends StatefulWidget {
  const TournamentInvitationBody({
    super.key,
    required this.tournament,
    required this.invitationId,
  });

  final TournamentListItemDto tournament;
  final String invitationId;

  @override
  State<TournamentInvitationBody> createState() =>
      _TournamentInvitationBodyState();
}

final class _TournamentInvitationBodyState
    extends State<TournamentInvitationBody> {
  bool _responding = false;
  bool _accepted = false;
  bool _rejected = false;
  String? _responseError;

  Future<void> _respond(bool accept) async {
    final cubit = context.read<TournamentRegistrationsCubit>();
    setState(() {
      _responding = true;
      _responseError = null;
    });
    if (accept) {
      await cubit.acceptInvitation(widget.invitationId);
    } else {
      await cubit.rejectInvitation(widget.invitationId);
    }
    if (!mounted) return;
    final state = cubit.state;
    if (state is TournamentRegistrationsLoaded) {
      final confirmed =
          state.registrationFor(cubit.currentUserId ?? '')?.status ==
          'CONFIRMED';
      setState(() {
        _responding = false;
        if (state.invitationError != null) {
          _responseError = state.invitationError;
        } else if (accept && confirmed) {
          _accepted = true;
        } else if (accept) {
          _responseError =
              'No se pudo confirmar la inscripción. Volvé a cargar.';
        } else {
          _rejected = true;
        }
      });
    }
  }

  Future<void> _reload() async {
    setState(() => _responding = true);
    await context.read<TournamentRegistrationsCubit>().load(
      loadInvitationList: false,
    );
    if (!mounted) return;
    final cubit = context.read<TournamentRegistrationsCubit>();
    final state = cubit.state;
    final confirmed =
        state is TournamentRegistrationsLoaded &&
        state.registrationFor(cubit.currentUserId ?? '')?.status == 'CONFIRMED';
    setState(() {
      _responding = false;
      _accepted = confirmed;
      _responseError = confirmed
          ? null
          : 'No se pudo confirmar la inscripción. Volvé a intentar.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return BlocConsumer<
      TournamentRegistrationsCubit,
      TournamentRegistrationsState
    >(
      listener: (context, state) {
        if (!_responding ||
            state is! TournamentRegistrationsLoaded ||
            state.responding) {
          return;
        }
        setState(() => _responding = false);
      },
      builder: (context, registrationsState) {
        final canRespond = registrationsState is TournamentRegistrationsLoaded;
        return Scaffold(
          backgroundColor: scheme.surfaceContainerLowest,
          appBar: AppBar(
            leading: IconButton(
              tooltip: 'Cerrar',
              onPressed: () => Navigator.of(context).maybePop(),
              icon: const Icon(AppIcons.close),
            ),
            title: const Text('Invitación'),
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 130),
            children: [
              if (registrationsState is TournamentRegistrationsLoading ||
                  registrationsState is TournamentRegistrationsInitial)
                const Padding(
                  padding: EdgeInsets.only(bottom: 14),
                  child: Center(child: CircularProgressIndicator()),
                ),
              if (registrationsState is TournamentRegistrationsFailure) ...[
                Text(
                  registrationsState.message,
                  style: TextStyle(color: scheme.error),
                ),
                TextButton(
                  onPressed: _responding ? null : _reload,
                  child: const Text('Volver a cargar'),
                ),
              ],
              _InvitationBanner(tournament: widget.tournament),
              if (_accepted) ...[
                const SizedBox(height: 14),
                const _InvitationOutcome(
                  text: 'Inscripción confirmada',
                  icon: AppIcons.check,
                ),
              ] else if (_rejected) ...[
                const SizedBox(height: 14),
                const _InvitationOutcome(
                  text: 'Invitación rechazada',
                  icon: AppIcons.close,
                ),
              ],
              if (_responseError != null) ...[
                const SizedBox(height: 14),
                Text(_responseError!, style: TextStyle(color: scheme.error)),
                if (_responseError!.contains('cargar'))
                  TextButton(
                    onPressed: _responding ? null : _reload,
                    child: const Text('Volver a cargar'),
                  ),
              ],
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
                endsAt: widget.tournament.endsAt,
                registrationClosesAt: widget.tournament.registrationClosesAt,
                venueName: widget.tournament.venueName,
              ),
            ],
          ),
          bottomNavigationBar: _accepted || _rejected
              ? null
              : Container(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                  decoration: BoxDecoration(
                    color: scheme.surfaceContainerLow,
                    border: Border(
                      top: BorderSide(color: scheme.outlineVariant),
                    ),
                  ),
                  child: SafeArea(
                    top: false,
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed:
                                !canRespond ||
                                    _responding ||
                                    _accepted ||
                                    _rejected
                                ? null
                                : () => _respond(false),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(0, 54),
                            ),
                            child: Text(_rejected ? 'Rechazada' : 'Rechazar'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: FilledButton.icon(
                            onPressed:
                                !canRespond ||
                                    _responding ||
                                    _accepted ||
                                    _rejected
                                ? null
                                : () => _respond(true),
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(0, 54),
                            ),
                            icon: _responding
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(AppIcons.check, size: 19),
                            label: Text(
                              _accepted ? 'Inscripción confirmada' : 'Aceptar',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
        );
      },
    );
  }
}

final class _InvitationOutcome extends StatelessWidget {
  const _InvitationOutcome({required this.text, required this.icon});

  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.primaryContainer,
      borderRadius: BorderRadius.circular(14),
    ),
    child: Row(children: [Icon(icon), const SizedBox(width: 8), Text(text)]),
  );
}

final class _InvitationBanner extends StatelessWidget {
  const _InvitationBanner({required this.tournament});

  final TournamentListItemDto tournament;

  /// `{org}`: `venueName`, cayendo al nombre del organizador sin sede
  /// declarada (D7). Nunca el nombre del propio torneo — misma resolución
  /// que el banner del Listado (`tournament_list_item_tile.dart
  /// ._invitationOrg`).
  String? get _org => tournament.venueName ?? tournament.organizerName;

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
            child: Icon(AppIcons.mail, color: scheme.onSurface, size: 19),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_org ?? tournament.name} te invitó',
                  style: const TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Revisá los datos y respondé abajo. Hasta que confirmes la inscripción no ves calendario ni tabla.',
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
