import 'package:flutter/material.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../shared/widgets/app_header.dart';
import '../../data/models/bracket_dto.dart';
import '../../data/tournaments_repository.dart';

class BracketScreen extends StatefulWidget {
  const BracketScreen({
    super.key,
    required this.tournamentId,
    required this.tournamentsRepository,
  });

  final String tournamentId;
  final TournamentsRepository tournamentsRepository;

  @override
  State<BracketScreen> createState() => _BracketScreenState();
}

class _BracketScreenState extends State<BracketScreen> {
  late Future<BracketDto> _bracketFuture;

  @override
  void initState() {
    super.initState();
    _bracketFuture = widget.tournamentsRepository.getBracket(
      tournamentId: widget.tournamentId,
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<BracketDto>(
      future: _bracketFuture,
      builder: (context, snapshot) {
        final bracket = snapshot.data;
        return Column(
          children: [
            //? `SheetHeader` con acción de volver (`cuadrala-torneos.jsx:428,439`):
            //? el bracket ya no depende sólo del gesto de swipe para cerrarse.
            AppHeader(
              title: 'Cuadro',
              subtitle: bracket != null
                  ? '${bracket.tournamentName} · ${bracket.bracketSize} jugadores'
                  : null,
              showBack: true,
              onBack: () => Navigator.of(context).maybePop(),
            ),
            Expanded(child: _buildBody(context, snapshot)),
          ],
        );
      },
    );
  }

  Widget _buildBody(BuildContext context, AsyncSnapshot<BracketDto> snapshot) {
    if (snapshot.connectionState == ConnectionState.waiting) {
      return const Center(child: CircularProgressIndicator());
    }

    if (snapshot.hasError) {
      final error = snapshot.error;
      if (error is AppFailure) {
        switch (error.code) {
          case 'FORMATO_NO_SOPORTADO':
            return _EmptyState(
              icon: AppIcons.info,
              title: 'Este torneo no arma cuadro',
              subtitle:
                  'El cuadro existe sólo para eliminación simple. Este torneo es round robin: seguí la posición en la tabla.',
            );
          case 'VALIDACION_FALLIDA':
            return _EmptyState(
              icon: AppIcons.group,
              title: 'Todavía no hay cuadro',
              subtitle: 'Hacen falta al menos 2 inscritos confirmados.',
            );
          default:
            return _EmptyState(
              icon: AppIcons.warning,
              title: 'Error',
              subtitle: error.message,
            );
        }
      }
      return _EmptyState(
        icon: AppIcons.warning,
        title: 'No se pudo cargar el cuadro',
        subtitle: 'Revisá tu conexión e intentá de nuevo.',
      );
    }

    if (!snapshot.hasData) {
      return _EmptyState(
        icon: AppIcons.info,
        title: 'Sin datos',
        subtitle: 'No hay información del cuadro.',
      );
    }

    return _BracketView(bracket: snapshot.data!);
  }
}

class _BracketView extends StatelessWidget {
  const _BracketView({required this.bracket});

  final BracketDto bracket;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: bracket.rounds
                  .map((round) => _BracketRoundCard(round: round))
                  .toList(),
            ),
          ),
          const SizedBox(height: 18),
          //? Los invitados sin cuenta participan del cuadro como cualquier
          //? otro participante confirmado.
          Text(
            'Los invitados participan del cuadro como cualquier participante confirmado.',
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontSize: 12,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _BracketRoundCard extends StatelessWidget {
  const _BracketRoundCard({required this.round});

  final BracketRoundDto round;

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final columnWidth = (screenWidth < 500) ? 160.0 : 190.0;

    return Container(
      width: columnWidth,
      margin: const EdgeInsets.only(right: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          //? Título de ronda 11.5/800 uppercase (`README.md:90`,
          //? `cuadrala-torneos.jsx:444`: `textTransform: 'uppercase'`).
          Text(
            round.name.toUpperCase(),
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.4,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 12),
          ...round.matches.map((match) => _BracketMatchCard(match: match)),
        ],
      ),
    );
  }
}

class _BracketMatchCard extends StatelessWidget {
  const _BracketMatchCard({required this.match});

  final BracketMatchDto match;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isInProgress = match.status == 'IN_PROGRESS';
    final isBye = match.status == 'BYE';

    return GestureDetector(
      onTap: !isBye ? () => _showMatchDetails(context) : null,
      child: Container(
        key: Key('bracket.matchCard.${match.matchId ?? match.matchNumber}'),
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          //? `border: 1.5px solid ${live ? 'var(--green)' : 'var(--line)'}`
          //? (`cuadrala-torneos.jsx:471`): el ancho es siempre 1.5, sólo el
          //? color cambia con el estado.
          border: Border.all(
            color: isInProgress ? scheme.primary : scheme.outlineVariant,
            width: 1.5,
          ),
          borderRadius: BorderRadius.circular(14),
          //? `boxShadow: '0 0 0 3px var(--green-bg)'` (`:472`): anillo sólido
          //? sin blur, no la aproximación previa de blur/spread.
          boxShadow: isInProgress
              ? [
                  BoxShadow(
                    color: scheme.primaryContainer.withValues(alpha: 0.35),
                    blurRadius: 0,
                    spreadRadius: 3,
                  ),
                ]
              : null,
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              color: scheme.surfaceContainerHighest,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'Partido ${match.matchNumber}',
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 10.5,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  if (!isBye)
                    Text(
                      _statusLabel(match.status),
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        color: isInProgress
                            ? scheme.primary
                            : scheme.onSurfaceVariant,
                      ),
                    ),
                ],
              ),
            ),
            _MatchPlayer(
              player: match.playerA,
              isWinner: match.winnerId == match.playerA?.userId,
              score: _scoreForPlayer(match.score, true),
            ),
            Divider(height: 1, color: scheme.outlineVariant),
            _MatchPlayer(
              player: match.playerB,
              isWinner: match.winnerId == match.playerB?.userId,
              score: _scoreForPlayer(match.score, false),
              bye: isBye,
            ),
            if (match.status == 'COMPLETED' && match.score != null) ...[
              Divider(height: 1, color: scheme.outlineVariant),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 5),
                child: Text(
                  _formatScore(match.score!),
                  style: TextStyle(
                    fontSize: 10,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showMatchDetails(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    showModalBottomSheet(
      context: context,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Partido ${match.matchNumber}',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            Text(
              match.playerA?.displayName ?? 'Por definir',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            Text('vs.', style: TextStyle(color: scheme.onSurfaceVariant)),
            Text(
              match.playerB?.displayName ?? 'Por definir',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            if (match.status == 'COMPLETED' && match.score != null) ...[
              const SizedBox(height: 12),
              Text(
                'Resultado: ${_formatScore(match.score!)}',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            const SizedBox(height: 12),
            Chip(
              label: Text(_statusLabel(match.status)),
              backgroundColor: match.status == 'IN_PROGRESS'
                  ? scheme.primary.withValues(alpha: 0.2)
                  : scheme.surfaceContainerHighest,
            ),
          ],
        ),
      ),
    );
  }

  //? Sólo "EN JUEGO" está en mayúsculas en el handoff (`cuadrala-torneos.jsx
  //? :476`); "Pendiente" queda en su capitalización literal (`:477`). No hay
  //? badge de estado para COMPLETED ni BYE en el handoff.
  String _statusLabel(String status) {
    return switch (status) {
      'PENDING' => 'Pendiente',
      'IN_PROGRESS' => 'EN JUEGO',
      'COMPLETED' => 'Completado',
      'BYE' => 'Bye',
      _ => status,
    };
  }

  //? `score` trae un puntaje por participante (`{userId, points}`,
  //? `get_tournament_bracket.use_case.ts:18-27`), no un arreglo de sets con
  //? claves `playerAScore`/`playerBScore` — esas claves nunca existieron en
  //? la respuesta real (ver `bracket_dto.dart`).
  int? _pointsForUser(List<BracketScoreEntryDto>? score, String? userId) {
    if (score == null || userId == null) return null;
    for (final entry in score) {
      if (entry.userId == userId) return entry.points;
    }
    return null;
  }

  String _formatScore(List<BracketScoreEntryDto> score) {
    final playerAPoints = _pointsForUser(score, match.playerA?.userId) ?? 0;
    final playerBPoints = _pointsForUser(score, match.playerB?.userId) ?? 0;
    return '$playerAPoints-$playerBPoints';
  }

  String? _scoreForPlayer(List<BracketScoreEntryDto>? score, bool playerA) {
    final userId = playerA ? match.playerA?.userId : match.playerB?.userId;
    final points = _pointsForUser(score, userId);
    return points?.toString();
  }
}

class _MatchPlayer extends StatelessWidget {
  const _MatchPlayer({
    required this.player,
    required this.isWinner,
    this.score,
    this.bye = false,
  });

  final BracketPlayerDto? player;
  final bool isWinner;
  final String? score;
  final bool bye;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    //? El handoff (`cuadrala-torneos.jsx:459-467`) no dibuja ningún ícono de
    //? check junto al ganador — sólo el peso de fuente y el color del score
    //? distinguen al ganador. El check-circle era una extra inventada.
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              player?.displayName ?? (bye ? 'Bye' : 'Por definir'),
              style: TextStyle(
                fontSize: 12,
                fontWeight: isWinner ? FontWeight.w700 : FontWeight.w500,
                color: player == null
                    ? scheme.onSurfaceVariant
                    : scheme.onSurface,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (score != null)
            Text(
              score!,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
                color: isWinner ? scheme.primary : scheme.onSurfaceVariant,
              ),
            ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: scheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: scheme.outlineVariant, width: 1.5),
              ),
              child: Icon(icon, size: 26, color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: 14),
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: TextStyle(fontSize: 14, color: scheme.onSurfaceVariant),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
