import 'package:flutter/material.dart';

import '../../../../core/theme/app_icons.dart';
import '../../data/models/tournament_registration_dto.dart';
import '../tournament_roster_grouping.dart';

/// Roster de un torneo de duplas fijas, para el organizador.
///
/// Muestra las parejas ya armadas en una fila cada una y, abajo, la bolsa de
/// quienes todavía no tienen compañero — que es lo que el organizador necesita
/// ver antes de generar el cuadro, porque una inscripción sin dupla lo frena.
///
class TournamentPairingSection extends StatefulWidget {
  const TournamentPairingSection({
    super.key,
    required this.roster,
    this.categoryName,
    required this.canManage,
    required this.busyRegistrationId,
    required this.onPair,
    required this.onUnpair,
  });

  final TournamentRoster roster;
  final String? categoryName;

  /// El emparejamiento es del organizador; el resto solo mira.
  final bool canManage;
  final String? busyRegistrationId;
  final void Function(String firstId, String secondId) onPair;
  final void Function(String registrationId) onUnpair;

  @override
  State<TournamentPairingSection> createState() =>
      _TournamentPairingSectionState();
}

class _TournamentPairingSectionState extends State<TournamentPairingSection> {
  Future<void> _openPairingSheetSV() async {
    final available = widget.roster.unpaired;
    if (!widget.canManage || widget.busyRegistrationId != null) return;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) {
        final selected = <String>[];
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final scheme = Theme.of(context).colorScheme;
            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: scheme.outlineVariant,
                          borderRadius: BorderRadius.circular(99),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Armar dupla',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Elegí dos inscriptos sin pareja',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (available.isEmpty)
                      Text(
                        'No hay inscriptos sin pareja.',
                        style: TextStyle(color: scheme.onSurfaceVariant),
                      )
                    else
                      Flexible(
                        child: ListView(
                          shrinkWrap: true,
                          children: [
                            for (final registration in available)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: _UnpairedTile(
                                  key: Key(
                                    'tournament.pairing.select.${registration.id}',
                                  ),
                                  registration: registration,
                                  categoryName: null,
                                  selected: selected.contains(registration.id),
                                  enabled: true,
                                  onTap: () => setSheetState(() {
                                    if (selected.contains(registration.id)) {
                                      selected.remove(registration.id);
                                    } else if (selected.length < 2) {
                                      selected.add(registration.id);
                                    }
                                  }),
                                ),
                              ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: selected.length == 2
                            ? () {
                                Navigator.of(sheetContext).pop();
                                widget.onPair(selected[0], selected[1]);
                              }
                            : null,
                        child: const Text('Armar dupla'),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final unpaired = widget.roster.unpaired;

    return Column(
      key: const Key('tournament.pairingSection'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'DUPLAS',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                  fontWeight: FontWeight.w800,
                  letterSpacing: .5,
                ),
              ),
            ),
            if (widget.canManage)
              TextButton(
                key: const Key('tournament.pairing.arm'),
                onPressed: widget.busyRegistrationId == null
                    ? _openPairingSheetSV
                    : null,
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  minimumSize: const Size(0, 36),
                ),
                child: const Text('Armar dupla'),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          key: const Key('tournament.pairing.card'),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: scheme.outlineVariant, width: 1.5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final pair in widget.roster.pairs)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _PairTile(
                    pair: pair,
                    categoryName: widget.categoryName,
                    canManage: widget.canManage,
                    busy:
                        widget.busyRegistrationId == pair.first.id ||
                        widget.busyRegistrationId == pair.second.id,
                    onUnpair: () => widget.onUnpair(pair.first.id),
                  ),
                ),
              if (widget.roster.pairs.isEmpty && unpaired.isEmpty)
                Text(
                  'Todavía no hay duplas armadas.',
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 12.5,
                  ),
                ),
              if (unpaired.isNotEmpty) ...[
                if (widget.roster.pairs.isNotEmpty) const SizedBox(height: 4),
                Text(
                  'Sin pareja (${unpaired.length})',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  widget.canManage
                      ? 'Todavía no armaste duplas.'
                      : 'Todavía esperan compañero.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 8),
                for (final reg in unpaired)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _UnpairedTile(
                      key: Key('tournament.unpaired.${reg.id}'),
                      registration: reg,
                      categoryName: widget.categoryName,
                      selected: false,
                      enabled: false,
                      onTap: () {},
                    ),
                  ),
              ],
              if (widget.roster.pairs.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    'Las duplas las armás vos. Confirmar a uno confirma también a su compañero.',
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontSize: 12,
                      height: 1.45,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PairTile extends StatelessWidget {
  const _PairTile({
    required this.pair,
    required this.categoryName,
    required this.canManage,
    required this.busy,
    required this.onUnpair,
  });

  final TournamentPair pair;
  final String? categoryName;
  final bool canManage;
  final bool busy;
  final VoidCallback onUnpair;

  @override
  Widget build(BuildContext context) {
    //? La dupla entra al cuadro solo si sus dos mitades están confirmadas.

    return Row(
      children: [
        _PairAvatar(registration: pair.first),
        Transform.translate(
          offset: const Offset(-8, 0),
          child: _PairAvatar(registration: pair.second),
        ),
        const SizedBox(width: 2),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                pair.label,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        if (canManage)
          busy
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : TextButton(
                  key: Key('tournament.unpair.${pair.first.id}'),
                  onPressed: onUnpair,
                  child: const Text('Deshacer'),
                ),
      ],
    );
  }
}

final class _PairAvatar extends StatelessWidget {
  const _PairAvatar({required this.registration});

  final TournamentRegistrationDto registration;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final label = registration.displayName;
    return CircleAvatar(
      radius: 14,
      backgroundColor: scheme.primaryContainer,
      child: Text(
        label.substring(0, 1).toUpperCase(),
        style: TextStyle(
          color: scheme.onPrimaryContainer,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _UnpairedTile extends StatelessWidget {
  const _UnpairedTile({
    super.key,
    required this.registration,
    required this.categoryName,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final TournamentRegistrationDto registration;
  final String? categoryName;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: selected
              ? scheme.primary.withValues(alpha: .10)
              : scheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            Icon(
              selected ? AppIcons.checkCircle : AppIcons.person,
              size: 18,
              color: selected ? scheme.primary : scheme.onSurfaceVariant,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    registration.displayName,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
