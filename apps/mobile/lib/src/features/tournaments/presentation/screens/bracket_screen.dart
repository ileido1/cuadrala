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
            if (error.code == 'FORMATO_NO_SOPORTADO') {
              return _EmptyState(
                icon: Icons.info_outline,
                title: 'Formato no soportado',
                subtitle:
                    'El cuadro está disponible solo para torneos de eliminación directa.',
              );
            }
            if (error.code == 'VALIDACION_FALLIDA') {
              return _EmptyState(
                icon: Icons.group,
                title: 'Cuadro pendiente',
                subtitle: 'Se necesitan al menos 2 jugadores confirmados.',
              );
            }
          }
          return _EmptyState(
            icon: Icons.error_outline,
            title: 'Error',
            subtitle: error.toString(),
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
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            bracket.tournamentName,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            '${bracket.totalRounds} ronda${bracket.totalRounds > 1 ? 's' : ''} • Cupo: ${bracket.bracketSize}',
            style: Theme.of(context).textTheme.bodySmall,
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
    return Container(
      width: 190,
      margin: const EdgeInsets.only(right: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            round.name,
            style: Theme.of(context).textTheme.titleSmall,
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

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        border: Border.all(
          color: isInProgress ? scheme.primary : scheme.outlineVariant,
          width: isInProgress ? 2 : 1,
        ),
        borderRadius: BorderRadius.circular(8),
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
      child: isBye
          ? Padding(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
              child: Text(
                'BYE',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: scheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            )
          : Column(
              children: [
                _MatchPlayer(
                  player: match.playerA,
                  isWinner: match.winnerId == match.playerA?.userId,
                ),
                Divider(
                  height: 1,
                  color: scheme.outlineVariant,
                ),
                _MatchPlayer(
                  player: match.playerB,
                  isWinner: match.winnerId == match.playerB?.userId,
                ),
                if (match.status == 'COMPLETED' && match.score != null) ...[
                  Divider(
                    height: 1,
                    color: scheme.outlineVariant,
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Text(
                      _formatScore(match.score!),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: scheme.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ],
            ),
    );
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
}

class _MatchPlayer extends StatelessWidget {
  const _MatchPlayer({
    required this.player,
    required this.isWinner,
  });

  final BracketPlayerDto? player;
  final bool isWinner;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
      child: Row(
        children: [
          if (isWinner) ...[
            Icon(
              Icons.check_circle,
              size: 16,
              color: scheme.primary,
            ),
            const SizedBox(width: 4),
          ] else if (player != null)
            SizedBox(width: 20),
          Expanded(
            child: Text(
              player?.displayName ?? 'Por definir',
              style: TextStyle(
                fontSize: 12,
                fontWeight: isWinner ? FontWeight.w700 : FontWeight.w500,
                color: player == null ? scheme.onSurfaceVariant : scheme.onSurface,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
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
            Icon(
              icon,
              size: 56,
              color: scheme.onSurfaceVariant,
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 14,
                color: scheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
