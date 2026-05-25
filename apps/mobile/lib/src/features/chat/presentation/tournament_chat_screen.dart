import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/service_locator.dart';
import 'chat_scroll_utils.dart';
import 'cubit/tournament_chat_cubit.dart';
import 'cubit/tournament_chat_state.dart';
import '../../profile/data/profile_repository.dart';
import '../data/chat_repository.dart';
import 'widgets/group_chat_message_bubble.dart';

final class TournamentChatScreen extends StatelessWidget {
  const TournamentChatScreen({super.key, required this.tournamentId});

  final String tournamentId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => TournamentChatCubit(
        chatRepository: getIt<ChatRepository>(),
        profileRepository: getIt<ProfileRepository>(),
        tournamentId: tournamentId,
      )..load(),
      child: _TournamentChatView(tournamentId: tournamentId),
    );
  }
}

final class _TournamentChatView extends StatefulWidget {
  const _TournamentChatView({required this.tournamentId});

  final String tournamentId;

  @override
  State<_TournamentChatView> createState() => _TournamentChatViewState();
}

class _TournamentChatViewState extends State<_TournamentChatView> {
  final _controller = TextEditingController();
  final _scroll = ScrollController();

  @override
  void dispose() {
    _controller.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      key: const Key('tournament.chat'),
      appBar: AppBar(
        title: const Text('Chat del torneo'),
        actions: [
          IconButton(
            onPressed: () => context.read<TournamentChatCubit>().load(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: BlocListener<TournamentChatCubit, TournamentChatState>(
              listenWhen: (prev, curr) {
                if (curr is! TournamentChatLoaded || curr.items.isEmpty) {
                  return false;
                }
                if (prev is TournamentChatLoading) return true;
                if (prev is! TournamentChatLoaded) return false;
                return (prev.sending && !curr.sending) ||
                    curr.items.length > prev.items.length;
              },
              listener: (_, __) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  scrollChatToBottom(_scroll);
                });
              },
              child: BlocBuilder<TournamentChatCubit, TournamentChatState>(
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
                            onPressed: () => context.read<TournamentChatCubit>().load(),
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
                        'Aún no hay mensajes. Sé el primero en escribir.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: scheme.onSurfaceVariant,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ),
                  );
                }
                return NotificationListener<ScrollNotification>(
                  onNotification: (n) {
                    if (n.metrics.pixels <= 120) {
                      context.read<TournamentChatCubit>().loadMore();
                    }
                    return false;
                  },
                  child: ListView.separated(
                    controller: _scroll,
                    padding: const EdgeInsets.all(16),
                    itemCount: loaded.items.length + (loaded.isLoadingMore ? 1 : 0),
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      if (loaded.isLoadingMore && index == 0) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Center(child: CircularProgressIndicator()),
                        );
                      }
                      final msgIndex =
                          loaded.isLoadingMore ? index - 1 : index;
                      final msg = loaded.items[msgIndex];
                      final showName = msgIndex == 0 ||
                          loaded.items[msgIndex - 1].authorUserId !=
                              msg.authorUserId;
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
            ),
          ),
          BlocBuilder<TournamentChatCubit, TournamentChatState>(
            builder: (context, state) {
              final sending = state is TournamentChatLoaded && state.sending;
              return SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _controller,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _send(context),
                          decoration: const InputDecoration(
                            hintText: 'Escribe un mensaje…',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      SizedBox(
                        width: 52,
                        height: 52,
                        child: FilledButton(
                          style: FilledButton.styleFrom(
                            minimumSize: Size.zero,
                            padding: EdgeInsets.zero,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          onPressed: sending ? null : () => _send(context),
                          child: sending
                              ? const SizedBox(
                                  height: 18,
                                  width: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.send, size: 20),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  void _send(BuildContext context) {
    final text = _controller.text;
    _controller.clear();
    context.read<TournamentChatCubit>().send(text);
  }
}
