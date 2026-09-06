import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../data/models/my_tournament_match_dto.dart';

/// Un partido del jugador: cuándo, dónde, contra quién, y qué contestó.
///
/// El horario del torneo se aparta primero y se confirma cuando los jugadores
/// aceptan, así que la tarjeta tiene que distinguir tres cosas que antes se
/// veían iguales: no hay cancha todavía, hay cancha y falta que contestes, y
/// está cerrado.
class MyTournamentMatchCard extends StatelessWidget {
  const MyTournamentMatchCard({
    super.key,
    required this.match,
    required this.busy,
    required this.onRespond,
  });

  final MyTournamentMatchDto match;
  final bool busy;
  final void Function(String response) onRespond;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final rival = match.opponents.isEmpty ? 'Rival a definir' : match.opponents.join(' · ');

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Ronda ${match.roundNumber} · Partido ${match.matchNumber}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ),
              _DecisionChip(match: match),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'vs $rival',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
          ),
          if (match.partners.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              'Con ${match.partners.join(' · ')}',
              style: TextStyle(fontSize: 12.5, color: scheme.onSurfaceVariant),
            ),
          ],
          const SizedBox(height: 10),
          //? Sin cancha apartada no se inventa un horario: decirlo es mejor que
          //? mostrar una fecha que después cambia.
          Text(
            match.hasSlot ? _whenAndWhereSV(match) : 'Horario a confirmar',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: match.hasSlot ? scheme.onSurface : scheme.onSurfaceVariant,
            ),
          ),
          //? Solo se pregunta cuando hay algo concreto que aceptar.
          if (match.hasSlot && match.decision == 'PENDING') ...[
            const SizedBox(height: 12),
            if (busy)
              const Center(
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              )
            else
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      key: Key('tournament.rejectSlot.${match.roundNumber}.${match.matchNumber}'),
                      onPressed: () => onRespond('REJECTED'),
                      child: const Text('No puedo'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton(
                      key: Key('tournament.acceptSlot.${match.roundNumber}.${match.matchNumber}'),
                      onPressed: () => onRespond('ACCEPTED'),
                      child: const Text('Me sirve'),
                    ),
                  ),
                ],
              ),
          ],
        ],
      ),
    );
  }
}

String _whenAndWhereSV(MyTournamentMatchDto match) {
  final at = match.scheduledAt;
  if (at == null) return 'Horario a confirmar';
  final when = DateFormat("EEEE d 'de' MMMM, HH:mm", 'es_ES').format(at.toLocal());
  final where = match.courtName;
  return where == null ? when : '$when · $where';
}

class _DecisionChip extends StatelessWidget {
  const _DecisionChip({required this.match});

  final MyTournamentMatchDto match;

  @override
  Widget build(BuildContext context) {
    final (label, color) = _labelSV(match);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: color),
      ),
    );
  }

  static (String, Color) _labelSV(MyTournamentMatchDto match) {
    if (!match.hasSlot) return ('Sin cancha', Colors.grey);
    return switch (match.decision) {
      'ACCEPTED' => ('Confirmado', Colors.green),
      'REJECTED' => ('Se reubica', Colors.orange),
      //? Ya contesté pero falta el resto: distinto de "no contestaste",
      //? que es lo que la app tiene que pedirte.
      _ => match.answered
          ? ('Esperando al resto', Colors.blue)
          : ('Falta tu respuesta', Colors.orange),
    };
  }
}
