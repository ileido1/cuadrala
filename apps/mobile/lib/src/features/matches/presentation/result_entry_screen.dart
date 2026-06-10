import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/theme/brand_colors.dart';
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
          listener: (context, state) {
            _pageController.animateToPage(
              3,
              duration: const Duration(milliseconds: 350),
              curve: Curves.easeOut,
            );
          },
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
                  if (state.step < 3) _StepProgressBar(step: state.step),
                  Expanded(
                    child: PageView(
                      controller: _pageController,
                      physics: const NeverScrollableScrollPhysics(),
                      children: const [
                        _CourtAssignStep(),
                        _ScoreEntryStep(),
                        _ConfirmStep(),
                        _ResultSummaryStep(),
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
    'Propuesta enviada',
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
              child: step == 3
                  ? const SizedBox.shrink()
                  : Align(
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
                    step == 3 ? _titles[3] : 'Paso ${step + 1} de 3 — ${_titles[step]}',
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
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: i == step
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
        child: switch (step) {
              3 => FilledButton(
                  onPressed: () => context.pop(),
                  child: const Text('Volver al partido'),
                ),
              2 => FilledButton(
                  onPressed: state.canSubmit ? cubit.submit : null,
                  child: state.submitting
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Enviar propuesta'),
                ),
              _ => FilledButton(
                  onPressed: _continueEnabled ? cubit.nextStep : null,
                  child: const Text('Continuar'),
                ),
            },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Step 0: _CourtAssignStep — tap-to-assign court (handoff)
// ---------------------------------------------------------------------------

class _CourtAssignStep extends StatefulWidget {
  const _CourtAssignStep();

  @override
  State<_CourtAssignStep> createState() => _CourtAssignStepState();
}

class _CourtAssignStepState extends State<_CourtAssignStep> {
  /// userId del jugador seleccionado en el pool "Sin asignar".
  String? _selected;

  static String _firstName(String name) {
    final t = name.trim();
    if (t.isEmpty) return '';
    return t.split(RegExp(r'\s+')).first;
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ResultEntryCubit, ResultEntryState>(
      builder: (context, state) {
        final cubit = context.read<ResultEntryCubit>();
        final scheme = Theme.of(context).colorScheme;
        final participants = state.match?.participants ?? [];
        final colorIndexOf = <String, int>{
          for (var i = 0; i < participants.length; i++)
            participants[i].userId: i,
        };
        final assigned = state.courtPositions;
        final assignedIds = assigned.values.toSet();
        final pool =
            participants.where((p) => !assignedIds.contains(p.userId)).toList();

        void place(CourtPosition pos) {
          final occupant = assigned[pos];
          if (_selected != null) {
            if (occupant != null) cubit.removeFromPosition(pos);
            cubit.assignToPosition(pos, _selected!);
            setState(() => _selected = null);
          } else if (occupant != null) {
            cubit.removeFromPosition(pos);
          }
        }

        Widget slot(CourtPosition pos, String label, Color accent) {
          final uid = assigned[pos];
          final p = uid != null
              ? participants.where((x) => x.userId == uid).firstOrNull
              : null;
          return Expanded(
            child: _CourtSlot(
              name: p != null ? _firstName(p.displayName ?? uid!) : null,
              colorIndex: uid != null ? (colorIndexOf[uid] ?? 0) : 0,
              label: label,
              accent: accent,
              onTap: () => place(pos),
            ),
          );
        }

        Widget teamRow(String team, Color accent, CourtPosition drive,
            CourtPosition reves) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Equipo $team',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.4,
                  color: accent,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  slot(drive, 'Drive', accent),
                  const SizedBox(width: 10),
                  slot(reves, 'Revés', accent),
                ],
              ),
            ],
          );
        }

        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          children: [
            Text(
              'Toca un jugador y luego su posición en la cancha. '
              'Toca una posición ocupada para liberarla.',
              style: TextStyle(fontSize: 13.5, color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            teamRow('A', scheme.primary, CourtPosition.teamADrive,
                CourtPosition.teamAReves),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                children: [
                  Expanded(child: Divider(color: scheme.outlineVariant)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: Text(
                      'RED',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  Expanded(child: Divider(color: scheme.outlineVariant)),
                ],
              ),
            ),
            teamRow('B', scheme.tertiary, CourtPosition.teamBDrive,
                CourtPosition.teamBReves),
            const SizedBox(height: 24),
            Text(
              'SIN ASIGNAR',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.3,
                color: scheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            if (pool.isEmpty)
              Row(
                children: [
                  Icon(Icons.check_rounded, size: 18, color: scheme.primary),
                  const SizedBox(width: 6),
                  Text(
                    'Todos en posición',
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: scheme.primary,
                    ),
                  ),
                ],
              )
            else
              Wrap(
                spacing: 14,
                runSpacing: 14,
                children: [
                  for (final p in pool)
                    _PoolAvatar(
                      name: _firstName(p.displayName ?? p.userId),
                      colorIndex: colorIndexOf[p.userId] ?? 0,
                      selected: _selected == p.userId,
                      onTap: () => setState(
                        () => _selected = _selected == p.userId ? null : p.userId,
                      ),
                    ),
                ],
              ),
          ],
        );
      },
    );
  }
}

/// Slot de cancha (paso 1): vacío = punteado del color del equipo con label
/// Drive/Revés; ocupado = avatar + primer nombre, borde sólido.
class _CourtSlot extends StatelessWidget {
  const _CourtSlot({
    required this.name,
    required this.colorIndex,
    required this.label,
    required this.accent,
    required this.onTap,
  });

  final String? name;
  final int colorIndex;
  final String label;
  final Color accent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final filled = name != null;
    final border = filled
        ? Border.all(color: accent, width: 2)
        : Border.all(color: accent.withValues(alpha: 0.6), width: 2);

    final content = Container(
      height: 96,
      decoration: BoxDecoration(
        color: filled ? scheme.surface : Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        border: filled ? border : null,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: filled
            ? [
                _ResultAvatar(name: name!, colorIndex: colorIndex, size: 36),
                const SizedBox(height: 6),
                Text(
                  name!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: scheme.onSurface,
                  ),
                ),
              ]
            : [
                Icon(Icons.group_outlined,
                    size: 22, color: scheme.onSurfaceVariant),
                const SizedBox(height: 6),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
      ),
    );

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: filled
          ? content
          : CustomPaint(
              painter: _DashedSlotPainter(color: accent.withValues(alpha: 0.6)),
              child: content,
            ),
    );
  }
}

class _DashedSlotPainter extends CustomPainter {
  _DashedSlotPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      const Radius.circular(14),
    );
    final path = Path()..addRRect(rrect);
    for (final metric in path.computeMetrics()) {
      var dist = 0.0;
      while (dist < metric.length) {
        final end = (dist + 6).clamp(0.0, metric.length);
        canvas.drawPath(metric.extractPath(dist, end), paint);
        dist += 10;
      }
    }
  }

  @override
  bool shouldRepaint(_DashedSlotPainter old) => old.color != color;
}

/// Avatar del pool "Sin asignar" (tappable, con halo lime al seleccionar).
class _PoolAvatar extends StatelessWidget {
  const _PoolAvatar({
    required this.name,
    required this.colorIndex,
    required this.selected,
    required this.onTap,
  });

  final String name;
  final int colorIndex;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: selected ? scheme.tertiary : Colors.transparent,
                width: 2,
              ),
              boxShadow: selected
                  ? [
                      BoxShadow(
                        color: scheme.tertiary.withValues(alpha: 0.22),
                        blurRadius: 0,
                        spreadRadius: 3,
                      ),
                    ]
                  : null,
            ),
            child: _ResultAvatar(name: name, colorIndex: colorIndex, size: 48),
          ),
          const SizedBox(height: 6),
          Text(
            name,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: selected ? scheme.onSurface : scheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _ResultAvatar extends StatelessWidget {
  const _ResultAvatar({
    required this.name,
    required this.colorIndex,
    required this.size,
  });

  final String name;
  final int colorIndex;
  final double size;

  @override
  Widget build(BuildContext context) {
    final color = BrandColors
        .avatarPalette[colorIndex % BrandColors.avatarPalette.length];
    final parts =
        name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    final initials = parts.isEmpty
        ? '?'
        : (parts.length == 1
            ? parts.first.characters.first
            : parts.first.characters.first + parts.last.characters.first);
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      child: Text(
        initials.toUpperCase(),
        style: TextStyle(
          color: Colors.white,
          fontSize: size * 0.4,
          fontWeight: FontWeight.w800,
        ),
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

// ---------------------------------------------------------------------------
// Step 3: _ResultSummaryStep — post-submit result card
// ---------------------------------------------------------------------------

class _ResultSummaryStep extends StatelessWidget {
  const _ResultSummaryStep();

  String _nameFor(String userId, MatchDetailDto? match) {
    if (match == null) return userId;
    final p = match.participants.where((p) => p.userId == userId).firstOrNull;
    return p?.displayName ?? userId;
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ResultEntryCubit, ResultEntryState>(
      builder: (context, state) {
        final scheme = Theme.of(context).colorScheme;
        final textTheme = Theme.of(context).textTheme;
        final match = state.match;
        final sets = state.sets;
        final winnerIndex = state.winnerTeamIndex;

        final teamANames = state.teamA.map((id) => _nameFor(id, match)).toList();
        final teamBNames = state.teamB.map((id) => _nameFor(id, match)).toList();

        int setsA = 0;
        int setsB = 0;
        for (final s in sets) {
          if (s.teamA > s.teamB) {
            setsA++;
          } else {
            setsB++;
          }
        }

        Widget teamRow({
          required String label,
          required List<String> names,
          required int setsWon,
          required bool isWinner,
        }) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: scheme.surfaceContainerLow,
              borderRadius: BorderRadius.circular(12),
              border: isWinner
                  ? Border.all(color: scheme.primary, width: 2)
                  : null,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            label,
                            style: textTheme.labelSmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.8,
                            ),
                          ),
                          if (isWinner) ...[
                            const SizedBox(width: 6),
                            Icon(
                              Icons.emoji_events_rounded,
                              size: 14,
                              color: scheme.primary,
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 6),
                      ...names.map(
                        (n) => Padding(
                          padding: const EdgeInsets.only(bottom: 2),
                          child: Text(
                            n,
                            style: textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  '$setsWon',
                  style: textTheme.displaySmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: isWinner ? scheme.primary : scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          );
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(Icons.check_circle_rounded, size: 52, color: scheme.primary),
              const SizedBox(height: 8),
              Text(
                'Propuesta enviada',
                textAlign: TextAlign.center,
                style: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text(
                'El resultado quedará confirmado cuando ambos equipos acepten.',
                textAlign: TextAlign.center,
                style: textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 28),
              teamRow(
                label: 'EQUIPO A',
                names: teamANames,
                setsWon: setsA,
                isWinner: winnerIndex == 0,
              ),
              const SizedBox(height: 8),
              if (sets.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: sets
                        .asMap()
                        .entries
                        .map(
                          (e) => Container(
                            margin: EdgeInsets.only(
                                right: e.key < sets.length - 1 ? 8 : 0),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: scheme.surfaceContainerHighest,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${e.value.teamA}–${e.value.teamB}',
                              style: textTheme.labelMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
              const SizedBox(height: 8),
              teamRow(
                label: 'EQUIPO B',
                names: teamBNames,
                setsWon: setsB,
                isWinner: winnerIndex == 1,
              ),
            ],
          ),
        );
      },
    );
  }
}
