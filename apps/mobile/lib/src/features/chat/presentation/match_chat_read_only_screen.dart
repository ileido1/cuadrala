import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/service_locator.dart';
import '../data/chat_repository.dart';
import 'cubit/match_chat_read_only_cubit.dart';
import 'cubit/match_chat_state.dart';
import 'widgets/chat_message_tile.dart';

final class MatchChatReadOnlyScreen extends StatelessWidget {
  const MatchChatReadOnlyScreen({super.key, required this.matchId});

  final String matchId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => MatchChatReadOnlyCubit(
        chatRepository: getIt<ChatRepository>(),
        matchId: matchId,
      )..load(),
      child: const _MatchChatReadOnlyView(),
    );
  }
}

final class _MatchChatReadOnlyView extends StatefulWidget {
  const _MatchChatReadOnlyView();

  @override
  State<_MatchChatReadOnlyView> createState() => _MatchChatReadOnlyViewState();
}

class _MatchChatReadOnlyViewState extends State<_MatchChatReadOnlyView> {
  final _scroll = ScrollController();

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('match.chat.readonly'),
      appBar: AppBar(
        title: const Text('Chat'),
        actions: [
          IconButton(
            onPressed: () => context.read<MatchChatReadOnlyCubit>().load(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: BlocBuilder<MatchChatReadOnlyCubit, MatchChatState>(
        builder: (context, state) {
          if (state is MatchChatLoading || state is MatchChatInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is MatchChatFailure) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(state.message, textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () => context.read<MatchChatReadOnlyCubit>().load(),
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            );
          }

          final loaded = state as MatchChatLoaded;
          if (loaded.items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Aún no hay mensajes.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
            );
          }
          return NotificationListener<ScrollNotification>(
            onNotification: (n) {
              if (n.metrics.pixels >= n.metrics.maxScrollExtent - 120) {
                context.read<MatchChatReadOnlyCubit>().loadMore();
              }
              return false;
            },
            child: ListView.separated(
              controller: _scroll,
              padding: const EdgeInsets.all(16),
              itemCount: loaded.items.length + (loaded.isLoadingMore ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                if (index >= loaded.items.length) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                return ChatMessageTile(message: loaded.items[index]);
              },
            ),
          );
        },
      ),
    );
  }
}