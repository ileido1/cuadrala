import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/service_locator.dart';
import '../../profile/data/profile_repository.dart';
import '../data/chat_repository.dart';
import 'cubit/tournament_chat_read_only_cubit.dart';
import 'cubit/tournament_chat_state.dart';
import 'widgets/group_chat_message_bubble.dart';

final class TournamentChatReadOnlyScreen extends StatelessWidget {
  const TournamentChatReadOnlyScreen({super.key, required this.tournamentId});

  final String tournamentId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => TournamentChatReadOnlyCubit(
        chatRepository: getIt<ChatRepository>(),
        profileRepository: getIt<ProfileRepository>(),
        tournamentId: tournamentId,
      )..load(),
      child: const _TournamentChatReadOnlyView(),
    );
  }
}

final class _TournamentChatReadOnlyView extends StatefulWidget {
  const _TournamentChatReadOnlyView();

  @override
  State<_TournamentChatReadOnlyView> createState() => _TournamentChatReadOnlyViewState();
}

class _TournamentChatReadOnlyViewState extends State<_TournamentChatReadOnlyView> {
  final _scroll = ScrollController();

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('tournament.chat.readonly'),
      appBar: AppBar(
        title: const Text('Chat del torneo'),
        actions: [
          IconButton(
            onPressed: () => context.read<TournamentChatReadOnlyCubit>().load(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: BlocBuilder<TournamentChatReadOnlyCubit, TournamentChatState>(
        builder: (context, state) {
          if (state is TournamentChatLoading || state is TournamentChatInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is TournamentChatFailure) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(state.message, textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () => context.read<TournamentChatReadOnlyCubit>().load(),
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            );
          }

          final loaded = state as TournamentChatLoaded;
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
                context.read<TournamentChatReadOnlyCubit>().loadMore();
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
                final msg = loaded.items[index];
                final showName = index == 0 ||
                    loaded.items[index - 1].authorUserId != msg.authorUserId;
                return GroupChatMessageBubble(
                  message: msg,
                  viewerUserId: loaded.viewerUserId,
                  showSenderName: showName,
                );
              },
            ),
          );
        },
      ),
    );
  }
}