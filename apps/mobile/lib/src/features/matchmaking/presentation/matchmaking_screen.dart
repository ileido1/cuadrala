import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/service_locator.dart';
import '../../../shared/widgets/app_header.dart';
import '../../../shared/widgets/error_state.dart';
import '../data/matchmaking_repository.dart';
import 'cubit/matchmaking_cubit.dart';
import 'cubit/matchmaking_state.dart';

final class MatchmakingScreen extends StatelessWidget {
  const MatchmakingScreen({super.key, required this.matchId});

  final String matchId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => MatchmakingCubit(
        repository: getIt<MatchmakingRepository>(),
        matchId: matchId,
      )..load(),
      child: _MatchmakingView(matchId: matchId),
    );
  }
}

final class _MatchmakingView extends StatelessWidget {
  const _MatchmakingView({required this.matchId});

  final String matchId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('matchmaking.suggestions'),
      body: BlocBuilder<MatchmakingCubit, MatchmakingState>(
        builder: (context, state) {
          if (state is MatchmakingLoading || state is MatchmakingInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is MatchmakingFailure) {
            return ErrorState(
              message: state.message,
              onRetry: () => context.read<MatchmakingCubit>().load(),
            );
          }

          final loaded = state as MatchmakingLoaded;
          if (loaded.suggestions.isEmpty) {
            return CustomScrollView(
              slivers: [
                const AppHeader(title: 'Sugerencias'),
                const SliverFillRemaining(
                  child: Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(
                        'No encontramos sugerencias para completar esta partida.',
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ),
              ],
            );
          }

          return CustomScrollView(
            slivers: [
              const AppHeader(title: 'Sugerencias'),
              SliverPadding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final suggestion = loaded.suggestions[index];
                      return _SuggestionTile(suggestion: suggestion, matchId: matchId);
                    },
                    childCount: loaded.suggestions.length,
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

final class _SuggestionTile extends StatelessWidget {
  const _SuggestionTile({required this.suggestion, required this.matchId});

  final dynamic suggestion;
  final String matchId;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: scheme.primaryContainer,
            child: Text(
              suggestion.name.substring(0, 1).toUpperCase(),
              style: TextStyle(color: scheme.onPrimaryContainer, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(suggestion.name, style: Theme.of(context).textTheme.bodyLarge),
                if (suggestion.displayMetric.isNotEmpty)
                  Text(
                    suggestion.displayMetric,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                  ),
                Text(
                  suggestion.source == 'ranking' ? 'Por ranking' : 'Directorio',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.primary,
                        fontWeight: FontWeight.w500,
                      ),
                ),
              ],
            ),
          ),
          OutlinedButton(
            onPressed: () => _shareLink(context, suggestion),
            child: const Text('Invitar'),
          ),
        ],
      ),
    );
  }

  void _shareLink(BuildContext context, dynamic suggestion) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Comparte el link de la partida con ${suggestion.name}'),
        duration: const Duration(seconds: 2),
      ),
    );
  }
}
