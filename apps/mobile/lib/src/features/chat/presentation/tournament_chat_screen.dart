import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/formatting/scheduled_label.dart';
import 'cubit/tournament_chat_cubit.dart';
import 'cubit/tournament_chat_state.dart';
import '../data/chat_repository.dart';

final class TournamentChatScreen extends StatelessWidget {
  const TournamentChatScreen({super.key, required this.tournamentId});

  final String tournamentId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => TournamentChatCubit(
        chatRepository: getIt<ChatRepository>(),
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
                    if (n.metrics.pixels >= n.metrics.maxScrollExtent - 120) {
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
                      if (index >= loaded.items.length) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Center(child: CircularProgressIndicator()),
                        );
                      }
                      final msg = loaded.items[index];
                      return Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(14),
                          color: scheme.surfaceContainerHighest,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              msg.text,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${shortDateLabel(msg.createdAt.toLocal())} · ${formatTimeHm(msg.createdAt.toLocal())}',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: scheme.onSurfaceVariant,
                                  ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                );
              },
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
