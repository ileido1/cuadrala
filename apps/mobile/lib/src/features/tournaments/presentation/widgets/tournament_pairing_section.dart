import 'package:flutter/material.dart';

import '../../data/models/tournament_registration_dto.dart';
import '../tournament_roster_grouping.dart';

/// Roster de un torneo de duplas fijas, para el organizador.
///
/// Muestra las parejas ya armadas en una fila cada una y, abajo, la bolsa de
/// quienes todavía no tienen compañero — que es lo que el organizador necesita
/// ver antes de generar el cuadro, porque una inscripción sin dupla lo frena.
///
/// El gesto de emparejar es tocar dos: el primero queda marcado y el segundo
/// cierra la dupla. Sin buscador ni pantalla aparte, que para un roster de
/// dieciséis personas sería ceremonia de más.
class TournamentPairingSection extends StatefulWidget {
  const TournamentPairingSection({
    super.key,
    required this.roster,
    required this.canManage,
    required this.busyRegistrationId,
    required this.onPair,
    required this.onUnpair,
  });

  final TournamentRoster roster;

  /// El emparejamiento es del organizador; el resto solo mira.
  final bool canManage;
  final String? busyRegistrationId;
  final void Function(String firstId, String secondId) onPair;
  final void Function(String registrationId) onUnpair;

  @override
  State<TournamentPairingSection> createState() => _TournamentPairingSectionState();
}

class _TournamentPairingSectionState extends State<TournamentPairingSection> {
  String? _selectedId;

  void _tapSV(TournamentRegistrationDto registration) {
    final selected = _selectedId;
    if (selected == null) {
      setState(() => _selectedId = registration.id);
      return;
    }
    if (selected == registration.id) {
      setState(() => _selectedId = null);
      return;
    }
    widget.onPair(selected, registration.id);
    setState(() => _selectedId = null);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final unpaired = widget.roster.unpaired;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final pair in widget.roster.pairs)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _PairTile(
              pair: pair,
              canManage: widget.canManage,
              busy: widget.busyRegistrationId == pair.first.id ||
                  widget.busyRegistrationId == pair.second.id,
              onUnpair: () => widget.onUnpair(pair.first.id),
            ),
          ),
        if (unpaired.isNotEmpty) ...[
          const SizedBox(height: 4),
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
                ? _selectedId == null
                    ? 'Tocá dos jugadores para armar la dupla.'
                    : 'Ahora tocá a su compañero.'
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
                selected: _selectedId == reg.id,
                enabled: widget.canManage && widget.busyRegistrationId == null,
                onTap: () => _tapSV(reg),
              ),
            ),
        ],
      ],
    );
  }
}

class _PairTile extends StatelessWidget {
  const _PairTile({
    required this.pair,
    required this.canManage,
    required this.busy,
    required this.onUnpair,
  });

  final TournamentPair pair;
  final bool canManage;
  final bool busy;
  final VoidCallback onUnpair;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    //? La dupla entra al cuadro solo si sus dos mitades están confirmadas.
    final confirmed = pair.isConfirmed;

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
            confirmed ? Icons.check_circle : Icons.hourglass_top,
            size: 18,
            color: confirmed ? Colors.green : Colors.orange,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              pair.label,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
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
      ),
    );
  }
}

class _UnpairedTile extends StatelessWidget {
  const _UnpairedTile({
    super.key,
    required this.registration,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final TournamentRegistrationDto registration;
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
          color: selected ? scheme.primary.withValues(alpha: .10) : scheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            Icon(
              selected ? Icons.check_circle : Icons.person_outline,
              size: 18,
              color: selected ? scheme.primary : scheme.onSurfaceVariant,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                registration.displayName,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
