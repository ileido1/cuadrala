import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../data/models/match_detail_dto.dart';
import '../domain/scoring/set_score.dart';
import 'cubit/result_entry_cubit.dart';
import 'cubit/result_entry_state.dart';

// ---------------------------------------------------------------------------
// Entry point — provides cubit via BlocProvider
// ---------------------------------------------------------------------------

final class ResultEntryScreen extends StatelessWidget {
  const ResultEntryScreen({super.key, required this.matchId});

  final String matchId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider<ResultEntryCubit>(
      create: (_) => getIt<ResultEntryCubit>(param1: matchId)..load(),
      child: const _ResultEntryView(),
    );
  }
}

// ---------------------------------------------------------------------------
// Main view — owns PageController, reacts to cubit step changes
// ---------------------------------------------------------------------------

class _ResultEntryView extends StatefulWidget {
  const _ResultEntryView();

  @override
  State<_ResultEntryView> createState() => _ResultEntryViewState();
}

class _ResultEntryViewState extends State<_ResultEntryView> {
  final PageController _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocListener(
      listeners: [
        BlocListener<ResultEntryCubit, ResultEntryState>(
          listenWhen: (prev, curr) => prev.step != curr.step,
          listener: (context, state) {
            _pageController.animateToPage(
              state.step,
              duration: const Duration(milliseconds: 280),
              curve: Curves.easeOut,
            );
          },
        ),
        BlocListener<ResultEntryCubit, ResultEntryState>(
          listenWhen: (prev, curr) => !prev.submitted && curr.submitted,
          listener: (context, state) => context.pop(),
        ),
        BlocListener<ResultEntryCubit, ResultEntryState>(
          listenWhen: (prev, curr) =>
              prev.error != curr.error && curr.error != null && curr.step == 2,
          listener: (context, state) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.error!)),
            );
          },
        ),
      ],
      child: BlocBuilder<ResultEntryCubit, ResultEntryState>(
        builder: (context, state) {
          if (state.loading) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }

          if (state.error != null && state.match == null) {
            return Scaffold(
              body: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48),
                      const SizedBox(height: 12),
                      Text(
                        state.error!,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: () =>
                            context.read<ResultEntryCubit>().load(),
                        child: const Text('Reintentar'),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }

          return Scaffold(
            key: const Key('result.entry.screen'),
            body: SafeArea(
              child: Column(
                children: [
                  _ResultHeader(step: state.step),
                  _StepProgressBar(step: state.step),
                  Expanded(
                    child: PageView(
                      controller: _pageController,
                      physics: const NeverScrollableScrollPhysics(),
                      children: const [
                        _CourtAssignStep(),
                        _ScoreEntryStep(),
                        _ConfirmStep(),
                      ],
                    ),
                  ),
                  _BottomNavBar(step: state.step, state: state),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _ResultHeader
// ---------------------------------------------------------------------------

class _ResultHeader extends StatelessWidget {
  const _ResultHeader({required this.step});

  final int step;

  static const _titles = [
    'Asignar posiciones',
    'Resultado',
    'Resumen',
  ];

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final cubit = context.read<ResultEntryCubit>();
    return Material(
      color: scheme.surface.withValues(alpha: 0.96),
      child: Container(
        height: 56,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: scheme.outlineVariant.withValues(alpha: 0.6),
            ),
          ),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 56,
              child: Align(
                alignment: Alignment.centerLeft,
                child: IconButton(
                  icon: const Icon(Icons.chevron_left, size: 28),
                  onPressed: () {
                    if (step == 0) {
                      context.pop();
                    } else {
                      cubit.prevStep();
                    }
                  },
                ),
              ),
            ),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Cargar resultado',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.2,
                    ),
                  ),
                  Text(
                    'Paso ${step + 1} de 3 — ${_titles[step]}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 56),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _StepProgressBar — 3 labeled segments
// ---------------------------------------------------------------------------

class _StepProgressBar extends StatelessWidget {
  const _StepProgressBar({required this.step});

  final int step;

  static const _labels = ['Cancha', 'Sets', 'Resumen'];

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
      child: Row(
        children: List.generate(3, (i) {
          final active = i <= step;
          return Expanded(
            child: Container(
              margin: EdgeInsets.only(right: i < 2 ? 6 : 0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    height: 4,
                    decoration: BoxDecoration(
                      color: active ? scheme.primary : scheme.outlineVariant,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _labels[i],
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: active
                          ? scheme.primary
                          : scheme.onSurfaceVariant.withValues(alpha: 0.6),
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _BottomNavBar
// ---------------------------------------------------------------------------

class _BottomNavBar extends StatelessWidget {
  const _BottomNavBar({required this.step, required this.state});

  final int step;
  final ResultEntryState state;

  bool get _continueEnabled => switch (step) {
        0 => state.isCourtComplete,
        1 => state.isScoreEntryComplete,
        _ => false,
      };

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<ResultEntryCubit>();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: SizedBox(
        width: double.infinity,
        child: step == 2
            ? FilledButton(
                onPressed: state.submitting ? null : cubit.submit,
                child: state.submitting
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Enviar propuesta'),
              )
            : FilledButton(
                onPressed: _continueEnabled ? cubit.nextStep : null,
                child: const Text('Continuar'),
              ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Step 0: _CourtAssignStep — drag-and-drop court assignment
// ---------------------------------------------------------------------------

class _CourtAssignStep extends StatelessWidget {
  const _CourtAssignStep();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ResultEntryCubit, ResultEntryState>(
      builder: (context, state) {
        final cubit = context.read<ResultEntryCubit>();
        final scheme = Theme.of(context).colorScheme;

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Asignar posiciones',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              'Arrastrá cada jugador a su posición en la cancha',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 16),
            _CourtWidget(state: state, cubit: cubit),
            const SizedBox(height: 16),
            _UnassignedPool(state: state, cubit: cubit),
          ],
        );
      },
    );
  }
}

class _CourtWidget extends StatelessWidget {
  const _CourtWidget({required this.state, required this.cubit});

  final ResultEntryState state;
  final ResultEntryCubit cubit;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      height: 240,
      decoration: BoxDecoration(
        border: Border.all(color: scheme.outline.withValues(alpha: 0.5)),
        borderRadius: BorderRadius.circular(12),
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.3),
      ),
      child: Row(
          children: [
            Expanded(
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      'Equipo A',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: scheme.primary,
                      ),
                    ),
                  ),
                  Expanded(
                    child: _CourtZone(
                      position: CourtPosition.teamADrive,
                      label: 'Drive',
                      state: state,
                      cubit: cubit,
                    ),
                  ),
                  Expanded(
                    child: _CourtZone(
                      position: CourtPosition.teamAReves,
                      label: 'Revés',
                      state: state,
                      cubit: cubit,
                    ),
                  ),
                ],
              ),
            ),
            VerticalDivider(
              width: 1,
              color: scheme.outline.withValues(alpha: 0.5),
            ),
            Expanded(
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      'Equipo B',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: scheme.tertiary,
                      ),
                    ),
                  ),
                  Expanded(
                    child: _CourtZone(
                      position: CourtPosition.teamBDrive,
                      label: 'Drive',
                      state: state,
                      cubit: cubit,
                    ),
                  ),
                  Expanded(
                    child: _CourtZone(
                      position: CourtPosition.teamBReves,
                      label: 'Revés',
                      state: state,
                      cubit: cubit,
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

class _CourtZone extends StatelessWidget {
  const _CourtZone({
    required this.position,
    required this.label,
    required this.state,
    required this.cubit,
  });

  final CourtPosition position;
  final String label;
  final ResultEntryState state;
  final ResultEntryCubit cubit;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final occupiedUserId = state.courtPositions[position];
    final participants = state.match?.participants ?? [];

    MatchParticipantDto? participant;
    if (occupiedUserId != null) {
      participant = participants
          .where((p) => p.userId == occupiedUserId)
          .firstOrNull;
    }

    return DragTarget<String>(
      onWillAcceptWithDetails: (details) =>
          !state.courtPositions.containsKey(position),
      onAcceptWithDetails: (details) {
        cubit.assignToPosition(position, details.data);
      },
      builder: (context, candidateData, rejectedData) {
        final isHighlighted = candidateData.isNotEmpty;
        return Container(
          margin: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: isHighlighted
                ? scheme.primaryContainer.withValues(alpha: 0.5)
                : scheme.surface.withValues(alpha: 0.4),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isHighlighted
                  ? scheme.primary
                  : scheme.outlineVariant.withValues(alpha: 0.5),
              width: isHighlighted ? 2 : 1,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: scheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 4),
              if (occupiedUserId != null && participant != null)
                LongPressDraggable<String>(
                  data: occupiedUserId,
                  onDragStarted: () {
                    cubit.removeFromPosition(position);
                  },
                  feedback: Material(
                    elevation: 4,
                    borderRadius: BorderRadius.circular(16),
                    child: _PlayerChip(
                      displayName: participant.displayName ?? occupiedUserId,
                      scheme: scheme,
                    ),
                  ),
                  child: _PlayerChip(
                    displayName: participant.displayName ?? occupiedUserId,
                    scheme: scheme,
                  ),
                )
              else
                Icon(
                  Icons.person_add_alt_1_outlined,
                  size: 20,
                  color: scheme.onSurfaceVariant.withValues(alpha: 0.4),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _UnassignedPool extends StatelessWidget {
  const _UnassignedPool({required this.state, required this.cubit});

  final ResultEntryState state;
  final ResultEntryCubit cubit;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final participants = state.match?.participants ?? [];
    final unassignedParticipants = participants
        .where((p) => !state.courtPositions.values.contains(p.userId))
        .toList();

    if (unassignedParticipants.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline, color: scheme.primary, size: 16),
            const SizedBox(width: 6),
            Text(
              'Todos asignados',
              style: TextStyle(
                color: scheme.primary,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Sin asignar',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: unassignedParticipants.map((p) {
            return LongPressDraggable<String>(
              data: p.userId,
              feedback: Material(
                elevation: 4,
                borderRadius: BorderRadius.circular(16),
                child: _PlayerChip(
                  displayName: p.displayName ?? p.userId,
                  scheme: scheme,
                ),
              ),
              childWhenDragging: Opacity(
                opacity: 0.3,
                child: _PlayerChip(
                  displayName: p.displayName ?? p.userId,
                  scheme: scheme,
                ),
              ),
              child: _PlayerChip(
                displayName: p.displayName ?? p.userId,
                scheme: scheme,
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class _PlayerChip extends StatelessWidget {
  const _PlayerChip({required this.displayName, required this.scheme});

  final String displayName;
  final ColorScheme scheme;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outline.withValues(alpha: 0.3)),
      ),
      child: Text(
        displayName,
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Step 1: _ScoreEntryStep — StatefulWidget for draft row
// ---------------------------------------------------------------------------

class _ScoreEntryStep extends StatefulWidget {
  const _ScoreEntryStep();

  @override
  State<_ScoreEntryStep> createState() => _ScoreEntryStepState();
}

class _ScoreEntryStepState extends State<_ScoreEntryStep> {
  int _draftA = 0;
  int _draftB = 0;

  void _resetDraft() => setState(() {
        _draftA = 0;
        _draftB = 0;
      });

  String? _validateDraft(ResultEntryState state) {
    final config = state.scoringConfig;
    if (config == null) return null;
    if (_draftA == 0 && _draftB == 0) return null;
    if (!config.isValidSetScore(_draftA, _draftB)) {
      return 'Marcador inválido para pádel. Ej: 6-4, 7-6.';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ResultEntryCubit, ResultEntryState>(
      builder: (context, state) {
        final cubit = context.read<ResultEntryCubit>();
        final scheme = Theme.of(context).colorScheme;
        final config = state.scoringConfig;
        final draftError = _validateDraft(state);
        final isDraftValid = config != null &&
            (_draftA != 0 || _draftB != 0) &&
            config.isValidSetScore(_draftA, _draftB);
        final matchOver = config != null && config.isMatchOver(state.sets);
        final isTiebreak = config != null &&
            _draftA == config.tiebreakAt &&
            _draftB == config.tiebreakAt;

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Resultado',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              'Ingresá el marcador set a set',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 16),

            // Completed sets
            ...List.generate(state.sets.length, (i) {
              final s = state.sets[i];
              final isLast = i == state.sets.length - 1;
              return Container(
                key: Key('set.row.$i'),
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Text(
                      'Set ${i + 1}',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        '${s.teamA}  –  ${s.teamB}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                      ),
                    ),
                    if (isLast)
                      IconButton(
                        key: const Key('remove.last.set'),
                        icon: Icon(
                          Icons.close,
                          color: scheme.error,
                          size: 20,
                        ),
                        onPressed: cubit.removeLastSet,
                      ),
                  ],
                ),
              );
            }),

            // Draft row — only when match not yet over
            if (!matchOver) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  border: Border.all(color: scheme.outline.withValues(alpha: 0.4)),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  children: [
                    Text(
                      'Set ${state.sets.length + 1}',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'Eq. A',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(width: 8),
                        _ScoreSpinner(
                          key: const Key('draft.score.a'),
                          value: _draftA,
                          onDecrement: _draftA > 0
                              ? () => setState(() => _draftA--)
                              : null,
                          onIncrement: _draftA < 7
                              ? () => setState(() => _draftA++)
                              : null,
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Text(
                            '–',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                        _ScoreSpinner(
                          key: const Key('draft.score.b'),
                          value: _draftB,
                          onDecrement: _draftB > 0
                              ? () => setState(() => _draftB--)
                              : null,
                          onIncrement: _draftB < 7
                              ? () => setState(() => _draftB++)
                              : null,
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'Eq. B',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                    if (isTiebreak) ...[
                      const SizedBox(height: 8),
                      Chip(
                        label: const Text('Tie-break'),
                        backgroundColor:
                            scheme.secondaryContainer.withValues(alpha: 0.6),
                      ),
                    ],
                    if (draftError != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        draftError,
                        key: const Key('draft.error'),
                        style: TextStyle(
                          color: scheme.error,
                          fontSize: 12,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  key: const Key('add.set.button'),
                  onPressed: isDraftValid
                      ? () {
                          cubit.addSet(
                            SetScore(teamA: _draftA, teamB: _draftB),
                          );
                          _resetDraft();
                        }
                      : null,
                  child: const Text('Agregar set'),
                ),
              ),
            ],

            if (matchOver) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: scheme.primaryContainer.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  'Partido finalizado.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: scheme.onPrimaryContainer,
                  ),
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}

class _ScoreSpinner extends StatelessWidget {
  const _ScoreSpinner({
    super.key,
    required this.value,
    required this.onDecrement,
    required this.onIncrement,
  });

  final int value;
  final VoidCallback? onDecrement;
  final VoidCallback? onIncrement;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          icon: const Icon(Icons.remove_circle_outline),
          onPressed: onDecrement,
        ),
        SizedBox(
          width: 32,
          child: Text(
            '$value',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        IconButton(
          icon: const Icon(Icons.add_circle_outline),
          onPressed: onIncrement,
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Step 2: _ConfirmStep
// ---------------------------------------------------------------------------

class _ConfirmStep extends StatelessWidget {
  const _ConfirmStep();

  String _sideLabel(String? side) => switch (side) {
        'DRIVE' => 'Drive',
        'REVES' => 'Revés',
        _ => 'Sin lado',
      };

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return BlocBuilder<ResultEntryCubit, ResultEntryState>(
      builder: (context, state) {
        final participants = state.match?.participants ?? [];
        final config = state.scoringConfig;

        MatchParticipantDto? participantFor(String uid) =>
            participants.where((p) => p.userId == uid).firstOrNull;

        Widget teamCard(String title, List<String> teamIds) {
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: scheme.primary,
                        ),
                  ),
                  const SizedBox(height: 8),
                  ...teamIds.map((uid) {
                    final p = participantFor(uid);
                    final side = _sideLabel(state.sideByUserId[uid]);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              p?.displayName ?? uid,
                              style:
                                  const TextStyle(fontWeight: FontWeight.w500),
                            ),
                          ),
                          Text(
                            side,
                            style: TextStyle(
                              color: scheme.onSurfaceVariant,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          );
        }

        final int teamAPoints =
            config?.computePoints(state.sets, 0) ?? 0;
        final int teamBPoints =
            config?.computePoints(state.sets, 1) ?? 0;
        final winner = state.winnerTeamIndex;
        final winsA = state.sets.where((s) => s.teamA > s.teamB).length;
        final winsB = state.sets.where((s) => s.teamB > s.teamA).length;

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Resumen',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),

            teamCard('Equipo A', state.teamA),
            const SizedBox(height: 8),
            teamCard('Equipo B', state.teamB),
            const SizedBox(height: 12),

            // Scores
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Marcador',
                      style: Theme.of(context)
                          .textTheme
                          .labelLarge
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    ...List.generate(state.sets.length, (i) {
                      final s = state.sets[i];
                      return Text(
                        'Set ${i + 1}: ${s.teamA} – ${s.teamB}',
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      );
                    }),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Winner
            if (winner != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: scheme.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.emoji_events, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      winner == 0
                          ? 'Equipo A ganó $winsA–$winsB'
                          : 'Equipo B ganó $winsB–$winsA',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        color: scheme.onPrimaryContainer,
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 8),

            // Points breakdown
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Puntos',
                      style: Theme.of(context)
                          .textTheme
                          .labelLarge
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Eq. A: $teamAPoints pts  ·  Eq. B: $teamBPoints pts',
                      style: TextStyle(
                        color: scheme.onSurfaceVariant,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
