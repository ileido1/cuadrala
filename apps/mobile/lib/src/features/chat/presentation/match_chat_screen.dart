import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/theme/app_icons.dart';
import '../../../shared/widgets/error_state.dart';
import 'chat_scroll_utils.dart';
import 'cubit/match_chat_cubit.dart';
import 'cubit/match_chat_state.dart';
import '../../profile/data/profile_repository.dart';
import '../data/chat_repository.dart';
import 'widgets/group_chat_message_bubble.dart';

final class MatchChatScreen extends StatelessWidget {
  const MatchChatScreen({super.key, required this.matchId});

  final String matchId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => MatchChatCubit(
        chatRepository: getIt<ChatRepository>(),
        profileRepository: getIt<ProfileRepository>(),
        matchId: matchId,
      )..load(),
      child: _MatchChatView(matchId: matchId),
    );
  }
}

final class _MatchChatView extends StatefulWidget {
  const _MatchChatView({required this.matchId});

  final String matchId;

  @override
  State<_MatchChatView> createState() => _MatchChatViewState();
}

class _MatchChatViewState extends State<_MatchChatView> {
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
      key: const Key('match.chat'),
      appBar: AppBar(
        title: const Text('Chat'),
        actions: [
          IconButton(
            onPressed: () => context.read<MatchChatCubit>().load(),
            icon: const Icon(AppIcons.refresh),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: BlocListener<MatchChatCubit, MatchChatState>(
              listenWhen: (prev, curr) {
                if (curr is! MatchChatLoaded || curr.items.isEmpty) {
                  return false;
                }
                if (prev is MatchChatLoading) return true;
                if (prev is! MatchChatLoaded) return false;
                return (prev.sending && !curr.sending) ||
                    curr.items.length > prev.items.length;
              },
              listener: (_, __) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  scrollChatToBottom(_scroll);
                });
              },
              child: BlocBuilder<MatchChatCubit, MatchChatState>(
              builder: (context, state) {
                if (state is MatchChatLoading || state is MatchChatInitial) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (state is MatchChatFailure) {
                  return ErrorState(
                    message: state.message,
                    onRetry: () => context.read<MatchChatCubit>().load(),
                  );
                }

                final loaded = state as MatchChatLoaded;
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
                      context.read<MatchChatCubit>().loadMore();
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
          BlocBuilder<MatchChatCubit, MatchChatState>(
            builder: (context, state) {
              final sending = state is MatchChatLoaded && state.sending;
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
                              : const Icon(AppIcons.send, size: 20),
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
    context.read<MatchChatCubit>().send(text);
  }
}

