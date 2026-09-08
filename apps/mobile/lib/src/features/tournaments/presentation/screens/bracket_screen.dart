import 'package:flutter/material.dart';

import '../../../../core/failures/app_failure.dart';
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
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          final error = snapshot.error;
          if (error is AppFailure) {
            switch (error.code) {
              case 'FORMATO_NO_SOPORTADO':
                return _EmptyState(
                  icon: Icons.info_outline,
                  title: 'Este torneo no arma cuadro',
                  subtitle:
                      'El cuadro existe sólo para eliminación simple. Este torneo es round robin: seguí la posición en la tabla.',
                );
              case 'VALIDACION_FALLIDA':
                return _EmptyState(
                  icon: Icons.group,
                  title: 'Todavía no hay cuadro',
                  subtitle: 'Hacen falta al menos 2 inscriptos confirmados.',
                );
              default:
                return _EmptyState(
                  icon: Icons.error_outline,
                  title: 'Error',
                  subtitle: error.message,
                );
            }
          }
          return _EmptyState(
            icon: Icons.error_outline,
            title: 'No se pudo cargar el cuadro',
            subtitle: 'Revisá tu conexión e intentá de nuevo.',
          );
        }

        if (!snapshot.hasData) {
          return _EmptyState(
            icon: Icons.info_outline,
            title: 'Sin datos',
            subtitle: 'No hay información del cuadro.',
          );
        }

        final bracket = snapshot.data!;
        return _BracketView(bracket: bracket);
      },
    );
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
          Text(
            bracket.tournamentName,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            '${bracket.totalRounds} ronda${bracket.totalRounds > 1 ? 's' : ''} · ${bracket.bracketSize} jugadores',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 18),
          Text(
            'Los huéspedes (inscriptos sin cuenta) no entran al cuadro: sólo jugadores con cuenta.',
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontSize: 12,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 20),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: bracket.rounds
                  .map((round) => _BracketRoundCard(round: round))
                  .toList(),
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
          Text(
            round.name,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
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
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          border: Border.all(
            color: isInProgress ? scheme.primary : scheme.outlineVariant,
            width: isInProgress ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(14),
          boxShadow: isInProgress
              ? [
                  BoxShadow(
                    color: scheme.primary.withValues(alpha: 0.3),
                    blurRadius: 8,
                    spreadRadius: 1,
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

  String _statusLabel(String status) {
    return switch (status) {
      'PENDING' => 'Pendiente',
      'IN_PROGRESS' => 'En juego',
      'COMPLETED' => 'Completado',
      'BYE' => 'Bye',
      _ => status,
    };
  }

  String _formatScore(List<Map<String, Object?>> score) {
    return score
        .map((scoreMap) {
          final playerAScore = scoreMap['playerAScore'] ?? '0';
          final playerBScore = scoreMap['playerBScore'] ?? '0';
          return '$playerAScore-$playerBScore';
        })
        .join(' ');
  }

  String? _scoreForPlayer(List<Map<String, Object?>>? score, bool playerA) {
    if (score == null || score.isEmpty) return null;
    final key = playerA ? 'playerAScore' : 'playerBScore';
    return score.map((set) => set[key]?.toString() ?? '0').join(' · ');
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

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
      child: Row(
        children: [
          if (isWinner) ...[
            Icon(Icons.check_circle, size: 16, color: scheme.primary),
            const SizedBox(width: 4),
          ],
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
