import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/theme/app_icons.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/cubit/session_cubit.dart';

final class ProfileSettingsScreen extends StatelessWidget {
  const ProfileSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: Theme.of(context).colorScheme.outlineVariant,
                ),
              ),
            ),
            child: Row(
              children: [
                Semantics(
                  button: true,
                  label: 'Volver',
                  child: Material(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(11),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(11),
                      onTap: () => Navigator.of(context).pop(),
                      child: const SizedBox(
                        width: 36,
                        height: 36,
                        child: Icon(AppIcons.chevronLeft, size: 18),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                const Text(
                  'Ajustes',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SettingsGroup(
                    title: 'Cuenta',
                    items: [
                      _Setting(
                        icon: AppIcons.person,
                        label: 'Editar perfil',
                        onTap: () => context.push(Routes.onboarding),
                      ),
                      _Setting(
                        icon: AppIcons.phone,
                        label: 'Teléfono y correo',
                      ),
                      _Setting(
                        icon: AppIcons.creditCard,
                        label: 'Métodos de pago',
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  _SettingsGroup(
                    title: 'Preferencias',
                    items: [
                      _Setting(
                        icon: AppIcons.bell,
                        label: 'Notificaciones',
                        onTap: () => context.push(Routes.notificationPrefs),
                      ),
                      _Setting(
                        icon: AppIcons.pin,
                        label: 'Zona y radio de búsqueda',
                      ),
                      _Setting(icon: AppIcons.moon, label: 'Apariencia'),
                    ],
                  ),
                  const SizedBox(height: 18),
                  _SettingsGroup(
                    title: 'Privacidad',
                    items: const [
                      _Setting(
                        icon: AppIcons.lock,
                        label: 'Quién ve mi perfil',
                      ),
                      _Setting(icon: AppIcons.info, label: 'Ayuda y soporte'),
                    ],
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () async {
                        await getIt<SessionCubit>().logout();
                        if (context.mounted) context.go(Routes.home);
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xfff87171),
                        minimumSize: const Size.fromHeight(48),
                        side: BorderSide(
                          color: Theme.of(context).colorScheme.outlineVariant,
                        ),
                      ),
                      child: const Text(
                        'Cerrar sesión',
                        style: TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

final class _SettingsGroup extends StatelessWidget {
  const _SettingsGroup({required this.title, required this.items});
  final String title;
  final List<_Setting> items;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w800,
          letterSpacing: .7,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
      const SizedBox(height: 8),
      Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Theme.of(context).colorScheme.outlineVariant,
          ),
        ),
        child: Column(
          children: [
            for (var index = 0; index < items.length; index++)
              _SettingsRow(item: items[index], divider: index > 0),
          ],
        ),
      ),
    ],
  );
}

final class _Setting {
  const _Setting({required this.icon, required this.label, this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
}

final class _SettingsRow extends StatelessWidget {
  const _SettingsRow({required this.item, required this.divider});
  final _Setting item;
  final bool divider;
  @override
  Widget build(BuildContext context) => Material(
    color: Colors.transparent,
    child: InkWell(
      onTap: item.onTap,
      child: Container(
        decoration: BoxDecoration(
          border: divider
              ? Border(
                  top: BorderSide(
                    color: Theme.of(context).colorScheme.outlineVariant,
                  ),
                )
              : null,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(
              item.icon,
              size: 18,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                item.label,
                style: const TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            Icon(
              AppIcons.chevronRight,
              size: 17,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ],
        ),
      ),
    ),
  );
}
