import 'package:flutter/material.dart';

import '../../../../core/theme/app_icons.dart';
import '../../data/models/tournament_registration_dto.dart';
import '../tournament_roster_grouping.dart';

/// Read-only roster sheet behind the Inscritos chevron for players
/// (`cuadrala-torneos.jsx:284`; design assumption A2 — the handoff draws the
/// chevron but no destination).
///
/// Grouped the same way the organizer's fixed-doubles roster is
/// (`groupRosterIntoPairs`, `tournament_roster_grouping.dart`): a paired
/// tournament shows "Duplas" then "Sin pareja"; an individual tournament
/// renders one flat list (`groupRosterIntoPairs` puts everyone in
/// `unpaired` when `paired` is false).
///
/// Redaction-safe by construction: it only ever reads
/// [TournamentRegistrationDto.displayName] and `.status`, never
/// `guestPhone`/`guestEmail` — the API already nulls those for any caller
/// who isn't the tournament's organizer (D9), and this sheet has no
/// organizer-only code path that could bypass that.
final class TournamentRosterSheet extends StatelessWidget {
  const TournamentRosterSheet({
    super.key,
    required this.registrations,
    required this.pairedRegistration,
  });

  final List<TournamentRegistrationDto> registrations;
  final bool pairedRegistration;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final roster = groupRosterIntoPairs(
      registrations: registrations,
      paired: pairedRegistration,
    );
    final hasPairs = roster.pairs.isNotEmpty;
    final hasUnpaired = roster.unpaired.isNotEmpty;

    return SafeArea(
      child: Padding(
        key: const Key('tournament.rosterSheet'),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Inscritos',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 12),
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (!hasPairs && !hasUnpaired)
                      Text(
                        'Todavía no hay nadie anotado.',
                        style: TextStyle(color: scheme.onSurfaceVariant),
                      ),
                    for (final pair in roster.pairs)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _RosterRow(
                          label: pair.label,
                          confirmed: pair.isConfirmed,
                        ),
                      ),
                    //? El encabezado sólo tiene sentido cuando conviven las
                    //? dos bolsas: en torneo individual todo cae en
                    //? `unpaired` y ese caso no debe leerse como "sin
                    //? pareja".
                    if (hasPairs && hasUnpaired) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Sin pareja',
                        style: Theme.of(context).textTheme.labelLarge
                            ?.copyWith(
                              color: scheme.onSurfaceVariant,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 6),
                    ],
                    for (final reg in roster.unpaired)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _RosterRow(
                          label: reg.displayName,
                          confirmed: reg.status == 'CONFIRMED',
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _RosterRow extends StatelessWidget {
  const _RosterRow({required this.label, required this.confirmed});

  final String label;
  final bool confirmed;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: Row(
        children: [
          Icon(
            confirmed ? AppIcons.checkCircle : AppIcons.pending,
            size: 18,
            color: confirmed ? scheme.primary : Colors.orange,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

/// Opens [TournamentRosterSheet] as a modal bottom sheet.
Future<void> showTournamentRosterSheet(
  BuildContext context, {
  required List<TournamentRegistrationDto> registrations,
  required bool pairedRegistration,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (_) => TournamentRosterSheet(
      registrations: registrations,
      pairedRegistration: pairedRegistration,
    ),
  );
}
