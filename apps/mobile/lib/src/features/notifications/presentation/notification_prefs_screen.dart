import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/service_locator.dart';
import '../../../shared/widgets/app_header.dart';
import '../data/notifications_repository.dart';
import 'cubit/notification_prefs_cubit.dart';
import 'cubit/notification_prefs_state.dart';

final class NotificationPrefsScreen extends StatelessWidget {
  const NotificationPrefsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => NotificationPrefsCubit(repository: getIt<NotificationsRepository>())..load(),
      child: const _NotificationPrefsView(),
    );
  }
}

final class _NotificationPrefsView extends StatelessWidget {
  const _NotificationPrefsView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('notification.prefs'),
      body: BlocBuilder<NotificationPrefsCubit, NotificationPrefsState>(
        builder: (context, state) {
          if (state is NotificationPrefsLoading || state is NotificationPrefsInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is NotificationPrefsFailure) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(state.message, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => context.read<NotificationPrefsCubit>().load(),
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            );
          }

          final loaded = state as NotificationPrefsLoaded;
          return CustomScrollView(
            slivers: [
              const AppHeader(title: 'Preferencias'),
              if (loaded.saveError != null)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: Text(
                      loaded.saveError!,
                      style: TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                  ),
                ),
              SliverPadding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _SectionHeader(title: 'Notificaciones push'),
                    _TypeToggleTile(
                      icon: Icons.people_outline,
                      title: 'Cupos disponibles',
                      subtitle: 'Cuando se abre un cupo en una partida',
                      type: 'MATCH_SLOT_OPENED',
                      value: loaded.isTypeEnabled('MATCH_SLOT_OPENED'),
                    ),
                    _TypeToggleTile(
                      icon: Icons.cancel_outlined,
                      title: 'Partidas canceladas',
                      subtitle: 'Cuando se cancela una partida',
                      type: 'MATCH_CANCELLED',
                      value: loaded.isTypeEnabled('MATCH_CANCELLED'),
                    ),
                    _TypeToggleTile(
                      icon: Icons.chat_bubble_outline,
                      title: 'Mensajes de chat',
                      subtitle: 'Cuando alguien escribe en el chat',
                      type: 'CHAT_MESSAGE',
                      value: loaded.isTypeEnabled('CHAT_MESSAGE'),
                    ),
                    _TypeToggleTile(
                      icon: Icons.payments_outlined,
                      title: 'Pagos pendientes',
                      subtitle: 'Recordatorios de pago',
                      type: 'PAYMENT_PENDING',
                      value: loaded.isTypeEnabled('PAYMENT_PENDING'),
                    ),
                  ]),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

final class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
              color: Theme.of(context).colorScheme.primary,
            ),
      ),
    );
  }
}

final class _TypeToggleTile extends StatelessWidget {
  const _TypeToggleTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.type,
    required this.value,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String type;
  final bool value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          Icon(icon, color: scheme.onSurfaceVariant, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.bodyLarge),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                ),
              ],
            ),
          ),
          BlocBuilder<NotificationPrefsCubit, NotificationPrefsState>(
            builder: (context, state) {
              final saving = state is NotificationPrefsLoaded && state.saving;
              return Switch(
                value: value,
                onChanged: saving ? null : (v) => context.read<NotificationPrefsCubit>().toggleType(type, v),
              );
            },
          ),
        ],
      ),
    );
  }
}
