import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/push/push_token_sync_service.dart';
import '../../../core/theme/app_icons.dart';
import '../../../shared/widgets/app_header.dart';
import '../../../shared/widgets/error_state.dart';
import '../data/notifications_repository.dart';
import 'cubit/notification_prefs_cubit.dart';
import 'cubit/notification_prefs_state.dart';

final class NotificationPrefsScreen extends StatelessWidget {
  const NotificationPrefsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) =>
          NotificationPrefsCubit(repository: getIt<NotificationsRepository>())
            ..load(),
      child: const _NotificationPrefsView(),
    );
  }
}

final class _NotificationPrefsView extends StatefulWidget {
  const _NotificationPrefsView();

  @override
  State<_NotificationPrefsView> createState() => _NotificationPrefsViewState();
}

final class _NotificationPrefsViewState extends State<_NotificationPrefsView> {
  PushEnrollmentResult? _webPushResult;
  bool _webPushEnabled = false;

  @override
  void initState() {
    super.initState();
    _loadWebPushStatus();
  }

  Future<void> _loadWebPushStatus() async {
    final enabled = await getIt<PushTokenSyncService>().isWebPushEnabled();
    if (mounted) setState(() => _webPushEnabled = enabled);
  }

  Future<void> _enableWebPush() async {
    final result = await getIt<PushTokenSyncService>().enableWebPush();
    if (mounted) {
      setState(() {
        _webPushResult = result;
        _webPushEnabled = result == PushEnrollmentResult.enabled;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('notification.prefs'),
      body: BlocBuilder<NotificationPrefsCubit, NotificationPrefsState>(
        builder: (context, state) {
          if (state is NotificationPrefsLoading ||
              state is NotificationPrefsInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is NotificationPrefsFailure) {
            return ErrorState(
              message: state.message,
              onRetry: () => context.read<NotificationPrefsCubit>().load(),
            );
          }

          final loaded = state as NotificationPrefsLoaded;
          return CustomScrollView(
            slivers: [
              const SliverToBoxAdapter(child: AppHeader(title: 'Preferencias')),
              if (loaded.saveError != null)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: Text(
                      loaded.saveError!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ),
                ),
              SliverPadding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _SectionHeader(title: 'Notificaciones push'),
                    _WebPushControl(
                      visible:
                          kIsWeb ||
                          getIt<PushTokenSyncService>().isWebPushAvailable,
                      result: _webPushResult,
                      enabled: _webPushEnabled,
                      onEnable: _enableWebPush,
                    ),
                    _TypeToggleTile(
                      icon: AppIcons.bolt,
                      title: 'Encontrar partida',
                      subtitle:
                          'Cuando haya una propuesta lista para confirmar',
                      type: 'QUICK_MATCH_PROPOSAL',
                      value: loaded.isTypeEnabled('QUICK_MATCH_PROPOSAL'),
                    ),
                    _TypeToggleTile(
                      icon: AppIcons.people,
                      title: 'Cupos disponibles',
                      subtitle: 'Cuando se abre un cupo en una partida',
                      type: 'MATCH_SLOT_OPENED',
                      value: loaded.isTypeEnabled('MATCH_SLOT_OPENED'),
                    ),
                    _TypeToggleTile(
                      icon: AppIcons.closeCircle,
                      title: 'Partidas canceladas',
                      subtitle: 'Cuando se cancela una partida',
                      type: 'MATCH_CANCELLED',
                      value: loaded.isTypeEnabled('MATCH_CANCELLED'),
                    ),
                    _TypeToggleTile(
                      icon: AppIcons.chat,
                      title: 'Mensajes de chat',
                      subtitle: 'Cuando alguien escribe en el chat',
                      type: 'CHAT_MESSAGE',
                      value: loaded.isTypeEnabled('CHAT_MESSAGE'),
                    ),
                    _TypeToggleTile(
                      icon: AppIcons.payments,
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
                key: Key('notification-type-$type'),
                value: value,
                onChanged: saving
                    ? null
                    : (v) => context.read<NotificationPrefsCubit>().toggleType(
                        type,
                        v,
                      ),
              );
            },
          ),
        ],
      ),
    );
  }
}

final class _WebPushControl extends StatelessWidget {
  const _WebPushControl({
    required this.visible,
    required this.result,
    required this.enabled,
    required this.onEnable,
  });

  final bool visible;
  final PushEnrollmentResult? result;
  final bool enabled;
  final Future<void> Function() onEnable;

  @override
  Widget build(BuildContext context) {
    if (!visible) return const SizedBox.shrink();
    final unavailable = result == PushEnrollmentResult.unavailable;
    final denied = result == PushEnrollmentResult.permissionDenied;
    final failed = result == PushEnrollmentResult.failed;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            unavailable
                ? 'Las notificaciones del navegador no están configuradas.'
                : denied
                ? 'Permití las notificaciones desde la configuración del navegador para activarlas.'
                : failed
                ? 'No se pudo activar el registro. Intentá de nuevo.'
                : 'Activá las notificaciones del navegador para recibir avisos fuera de la app.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 4),
          SwitchListTile.adaptive(
            key: const Key('web-push-toggle'),
            contentPadding: EdgeInsets.zero,
            title: const Text('Notificaciones del navegador'),
            value: enabled,
            onChanged: unavailable || enabled ? null : (_) => onEnable(),
          ),
        ],
      ),
    );
  }
}
