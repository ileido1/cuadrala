import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../router/routes.dart';
import '../../../shared/widgets/app_header.dart';
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
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      key: const Key('notifications.screen'),
      body: SafeArea(
        child: BlocBuilder<NotificationsCubit, NotificationsState>(
          builder: (context, state) {
            return Column(
              children: [
                AppHeader(
                  title: 'Notificaciones',
                  showBack: false,
                  rightAction: TextButton(
                    onPressed: state.isMutating ? null : () => context.read<NotificationsCubit>().markAllAsRead(),
                    child: const Text('Marcar leídas'),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: scheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: scheme.outlineVariant),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: _TabChip(
                            label: 'Todas',
                            isActive: !state.onlyUnread,
                            onTap: () => context.read<NotificationsCubit>().toggleOnlyUnread(false),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _TabChip(
                            label: 'No leídas',
                            isActive: state.onlyUnread,
                            onTap: () => context.read<NotificationsCubit>().toggleOnlyUnread(true),
                          ),
                        ),
                      ],
                    ),
                  ),
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

final class _Body extends StatelessWidget {
  const _Body({required this.state});

  final NotificationsState state;

  @override
  Widget build(BuildContext context) {
    if (state.status == NotificationsStatus.loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.status == NotificationsStatus.error) {
      return _ErrorState(message: state.errorMessage ?? 'No pudimos cargar las notificaciones.');
    }
    if (state.items.isEmpty) {
      return const _EmptyState();
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(12, 6, 12, 16),
      itemCount: state.items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 6),
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
    final (icon, bg, fg) = _styleForType(scheme, notification.type);

    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () {
        if (notification.isUnread) {
          context.read<NotificationsCubit>().markOneAsRead(notification.id);
        }
        context.push('${Routes.notifications}/${notification.id}');
      },
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: notification.isUnread ? scheme.surfaceContainerHighest.withValues(alpha: 0.55) : scheme.surface,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
              child: Icon(icon, color: fg),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _relativeTime(notification.createdAt),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    notification.body,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: scheme.onSurfaceVariant, height: 1.2),
                  ),
                ],
              ),
            ),
            if (notification.isUnread) ...[
              const SizedBox(width: 10),
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 6),
                decoration: BoxDecoration(color: scheme.primary, shape: BoxShape.circle),
              ),
            ],
          ],
        ),
      ),
    );
  }

  (IconData, Color, Color) _styleForType(ColorScheme scheme, NotificationType type) {
    return switch (type) {
      NotificationType.chatMessage => (Icons.chat_bubble_outline, Colors.blue.withValues(alpha: 0.12), Colors.blue.shade700),
      NotificationType.matchSlotOpened => (Icons.emoji_events_outlined, scheme.primary.withValues(alpha: 0.12), scheme.primary),
      NotificationType.paymentPending => (Icons.credit_card, scheme.tertiary.withValues(alpha: 0.25), scheme.onTertiary),
      NotificationType.matchCancelled => (Icons.event_busy, scheme.error.withValues(alpha: 0.12), scheme.error),
      NotificationType.unknown => (Icons.notifications_none_outlined, scheme.surfaceContainerHighest, scheme.onSurfaceVariant),
    };
  }
}

final class _TabChip extends StatelessWidget {
  const _TabChip({required this.label, required this.isActive, required this.onTap});

  final String label;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: isActive ? scheme.surface : Colors.transparent,
          border: Border.all(color: isActive ? scheme.outlineVariant : Colors.transparent),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: isActive ? scheme.onSurface : scheme.onSurfaceVariant,
            ),
          ),
        ),
      ),
    );
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
            Icon(Icons.notifications_none_outlined, size: 42, color: scheme.onSurfaceVariant),
            const SizedBox(height: 10),
            const Text('Sin notificaciones nuevas', style: TextStyle(fontWeight: FontWeight.w900)),
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
  if (diff.inDays == 1) return 'Ayer';
  return 'hace ${diff.inDays} d';
}

