import 'package:flutter/material.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../shared/widgets/count_stepper.dart';
import '../../data/models/tournament_schedule_dto.dart';

/// Organizer-only bottom sheet to load a match result, submitted through
/// `POST /tournaments/:tournamentId/matches/:matchId/results` (D1) — never
/// the settle endpoint.
///
/// One [CountStepper] per [TournamentScheduleMatchDto.sides] entry drives
/// that side's point total (`min: 0, max: 9`, mirroring
/// `cuadrala-torneo-org.jsx:335`). On submit, every registration inside a
/// side gets a score row, including invited participants without an account.
final class ResultEntrySheet extends StatefulWidget {
  const ResultEntrySheet({
    super.key,
    required this.match,
    required this.roundName,
    required this.onSubmit,
  });

  final TournamentScheduleMatchDto match;
  final String roundName;
  final Future<void> Function(List<TournamentScheduleMatchScoreDto> scores)
  onSubmit;

  @override
  State<ResultEntrySheet> createState() => _ResultEntrySheetState();
}

class _ResultEntrySheetState extends State<ResultEntrySheet> {
  late final Map<String, int> _pointsBySideKey = {
    for (final side in widget.match.sides) side.sideKey: 0,
  };
  bool _submitting = false;
  String? _error;

  /// "{name} vs {name}" splits cleanly onto one label per side for the
  /// common singles case; any mismatch (doubles, missing label) falls back
  /// to "Lado {sideKey}".
  String _sideLabel(TournamentScheduleMatchSideDto side, int index) {
    final parts = widget.match.label.split(' vs ');
    if (parts.length == widget.match.sides.length && index < parts.length) {
      return parts[index];
    }
    return 'Lado ${side.sideKey.toUpperCase()}';
  }

  Future<void> _submitSV() async {
    setState(() {
      _submitting = true;
      _error = null;
    });

    final scores = <TournamentScheduleMatchScoreDto>[];
    for (final side in widget.match.sides) {
      // Older cached schedules only contain userIds. Keep them submit-able;
      // newly materialized matches always provide registrationIds, including
      // invited participants without accounts.
      if (side.registrationIds.isNotEmpty) {
        scores.addAll(
          side.registrationIds.map(
            (registrationId) => TournamentScheduleMatchScoreDto(
              tournamentRegistrationId: registrationId,
              points: _pointsBySideKey[side.sideKey] ?? 0,
            ),
          ),
        );
      } else {
        scores.addAll(
          side.userIds.whereType<String>().map(
            (userId) => TournamentScheduleMatchScoreDto(
              userId: userId,
              points: _pointsBySideKey[side.sideKey] ?? 0,
            ),
          ),
        );
      }
    }

    try {
      await widget.onSubmit(scores);
      if (!mounted) return;
      //? `maybePop` no hace nada si este widget no está detrás de una ruta
      //? empujada (p. ej. embebido directo en un test) — en ese caso hay que
      //? liberar `_submitting` manualmente para no dejar el spinner girando.
      final popped = await Navigator.of(context).maybePop();
      if (!popped && mounted) {
        setState(() => _submitting = false);
      }
    } on AppFailure catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = 'No se pudo cargar el resultado.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final subtitle = widget.match.courtName != null
        ? '${widget.roundName} · ${widget.match.courtName}'
        : widget.roundName;

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 18,
        bottom: MediaQuery.of(context).viewInsets.bottom + 30,
      ),
      child: Column(
        key: const Key('tournament.resultEntrySheet'),
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Cargar resultado',
            style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 13),
          ),
          const SizedBox(height: 16),
          for (var i = 0; i < widget.match.sides.length; i++) ...[
            if (i > 0) const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Text(
                    _sideLabel(widget.match.sides[i], i),
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                CountStepper(
                  value: _pointsBySideKey[widget.match.sides[i].sideKey] ?? 0,
                  min: 0,
                  max: 9,
                  onChanged: (value) => setState(
                    () => _pointsBySideKey[widget.match.sides[i].sideKey] =
                        value,
                  ),
                ),
              ],
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: TextStyle(color: scheme.error, fontSize: 13)),
          ],
          const SizedBox(height: 18),
          FilledButton.icon(
            key: const Key('tournament.resultEntrySheet.submit'),
            onPressed: _submitting ? null : _submitSV,
            icon: _submitting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(AppIcons.check),
            label: const Text('Guardar resultado'),
          ),
        ],
      ),
    );
  }
}

/// Opens [ResultEntrySheet] as a modal bottom sheet.
Future<void> showResultEntrySheet(
  BuildContext context, {
  required TournamentScheduleMatchDto match,
  required String roundName,
  required Future<void> Function(List<TournamentScheduleMatchScoreDto> scores)
  onSubmit,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (_) => ResultEntrySheet(
      match: match,
      roundName: roundName,
      onSubmit: onSubmit,
    ),
  );
}
