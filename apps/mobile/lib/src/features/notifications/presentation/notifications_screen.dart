import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/brand_colors.dart';
import '../../../router/routes.dart';
import '../data/models/notification_delivery_dto.dart';
import 'cubit/notifications_cubit.dart';
import 'cubit/notifications_state.dart';

final class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

final class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationsCubit>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('notifications.screen'),
      body: SafeArea(
        bottom: false,
        child: BlocBuilder<NotificationsCubit, NotificationsState>(
          builder: (context, state) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _AvisosHeader(
                  hasUnread: state.items.any((n) => n.isUnread),
                  isMutating: state.isMutating,
                  onMarkAllRead: () =>
                      context.read<NotificationsCubit>().markAllAsRead(),
                ),
                Expanded(child: _Body(state: state)),
              ],
            );
          },
        ),
      ),
    );
  }
}

final class _AvisosHeader extends StatelessWidget {
  const _AvisosHeader({
    required this.hasUnread,
    required this.isMutating,
    required this.onMarkAllRead,
  });

  final bool hasUnread;
  final bool isMutating;
  final VoidCallback onMarkAllRead;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Text(
              'Avisos',
              style: TextStyle(
                fontSize: 27,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
                color: scheme.onSurface,
              ),
            ),
          ),
          if (hasUnread)
            TextButton(
              onPressed: isMutating ? null : onMarkAllRead,
              style: TextButton.styleFrom(
                foregroundColor: scheme.primary,
                textStyle: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
              child: const Text('Marcar leídas'),
            ),
        ],
      ),
    );
  }
}

final class _Body extends StatelessWidget {
  const _Body({required this.state});

  final NotificationsState state;

  @override
  Widget build(BuildContext context) {
    if (state.status == NotificationsStatus.loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.status == NotificationsStatus.error) {
      return _ErrorState(
        message: state.errorMessage ?? 'No pudimos cargar las notificaciones.',
      );
    }
    if (state.items.isEmpty) {
      return const _EmptyState();
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      itemCount: state.items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final n = state.items[index];
        return _NotificationTile(notification: n);
      },
    );
  }
}

final class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.notification});

  final NotificationDeliveryDto notification;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final icon = _iconForType(notification.type);
    final greenBg = scheme.primary.withValues(alpha: 0.15);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () {
          if (notification.isUnread) {
            context.read<NotificationsCubit>().markOneAsRead(notification.id);
          }
          final link = notification.deepLink;
          if (link != null && link.startsWith('/matches/')) {
            final matchId = link.replaceFirst('/matches/', '').split('/').first;
            if (matchId.isNotEmpty) {
              if (notification.type == NotificationType.chatMessage) {
                context.push(Routes.matchChat(matchId));
              } else {
                context.push(Routes.matchDetail(matchId));
              }
              return;
            }
          }
          context.push('${Routes.notifications}/${notification.id}');
        },
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: notification.isUnread ? scheme.surface : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: notification.isUnread
                  ? scheme.outlineVariant
                  : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: greenBg,
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Icon(icon, color: scheme.primary, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      notification.title,
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: scheme.onSurface,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      notification.body,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12.5,
                        color: scheme.onSurfaceVariant,
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _relativeTime(notification.createdAt),
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: scheme.onSurfaceVariant.withValues(alpha: 0.75),
                    ),
                  ),
                  if (notification.isUnread) ...[
                    const SizedBox(height: 6),
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: BrandColors.limeAccent,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _iconForType(NotificationType type) {
    return switch (type) {
      NotificationType.chatMessage => Icons.chat_bubble_outline,
      NotificationType.matchSlotOpened => Icons.emoji_events_outlined,
      NotificationType.paymentPending => Icons.credit_card,
      NotificationType.paymentConfirmed => Icons.check_circle_outline,
      NotificationType.matchPlayerJoined => Icons.person_add_alt_1,
      NotificationType.matchCancelled => Icons.event_busy,
      NotificationType.unknown => Icons.notifications_none_outlined,
    };
  }
}

final class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.notifications_none_outlined,
              size: 42,
              color: scheme.onSurfaceVariant,
            ),
            const SizedBox(height: 10),
            const Text(
              'Sin notificaciones nuevas',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              'Cuando haya novedades de tus partidas, te avisamos por aquí.',
              textAlign: TextAlign.center,
              style: TextStyle(color: scheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}

final class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 42, color: scheme.error),
            const SizedBox(height: 10),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => context.read<NotificationsCubit>().load(),
              child: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }
}

String _relativeTime(DateTime dt) {
  final now = DateTime.now();
  final diff = now.difference(dt);
  if (diff.inMinutes < 1) return 'ahora';
  if (diff.inMinutes < 60) return 'hace ${diff.inMinutes} min';
  if (diff.inHours < 24) return 'hace ${diff.inHours} h';
  if (diff.inDays == 1) return 'ayer';
  return 'hace ${diff.inDays} d';
}
