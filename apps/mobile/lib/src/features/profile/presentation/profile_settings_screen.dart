import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/di/service_locator.dart';
import '../../../shared/widgets/app_header.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/cubit/session_cubit.dart';

final class ProfileSettingsScreen extends StatelessWidget {
  const ProfileSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          const SliverToBoxAdapter(
            child: AppHeader(title: 'Ajustes', showBack: true),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
            sliver: SliverList.list(
              children: [
                const _SettingsHeading('Cuenta'),
                _SettingsTile(
                  icon: AppIcons.person,
                  title: 'Editar perfil',
                  subtitle: 'Nombre, deportes y datos de juego',
                  onTap: () => context.push(Routes.onboarding),
                ),
                _SettingsTile(
                  icon: AppIcons.racquetSport,
                  title: 'Mis deportes',
                  subtitle: 'Preferencias y categorías',
                  onTap: () => context.push(Routes.mySports),
                ),
                const SizedBox(height: 20),
                const _SettingsHeading('Preferencias'),
                _SettingsTile(
                  icon: AppIcons.bell,
                  title: 'Notificaciones',
                  subtitle: 'Elegí qué avisos querés recibir',
                  onTap: () => context.push(Routes.notificationPrefs),
                ),
                _SettingsTile(
                  icon: AppIcons.calendar,
                  title: 'Disponibilidad',
                  subtitle: 'Horarios para encontrar partidas',
                  onTap: () => context.push(Routes.availability),
                ),
                const SizedBox(height: 20),
                const _SettingsHeading('Privacidad'),
                const _DisabledTile(
                  icon: AppIcons.public,
                  title: 'Quién ve mi perfil',
                  subtitle:
                      'La visibilidad del perfil requiere configuración de privacidad.',
                ),
                const _DisabledTile(
                  icon: AppIcons.pin,
                  title: 'Clubes favoritos',
                  subtitle:
                      'Esta función todavía no está soportada por el backend.',
                ),
                const _DisabledTile(
                  icon: AppIcons.lock,
                  title: 'Privacidad y contacto',
                  subtitle:
                      'La configuración de privacidad aún no está disponible.',
                ),
                const SizedBox(height: 18),
                OutlinedButton(
                  onPressed: () async {
                    await getIt<SessionCubit>().logout();
                    if (context.mounted) context.go(Routes.home);
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.error,
                    minimumSize: const Size.fromHeight(48),
                  ),
                  child: const Text('Cerrar sesión'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

final class _SettingsHeading extends StatelessWidget {
  const _SettingsHeading(this.title);

  final String title;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
    child: Text(
      title,
      style: Theme.of(context).textTheme.titleSmall?.copyWith(
        color: Theme.of(context).colorScheme.primary,
        fontWeight: FontWeight.w800,
      ),
    ),
  );
}

final class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 8),
    child: ListTile(
      leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
      subtitle: Text(subtitle),
      trailing: const Icon(AppIcons.chevronRight),
      onTap: onTap,
    ),
  );
}

final class _DisabledTile extends StatelessWidget {
  const _DisabledTile({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 8),
    child: ListTile(
      enabled: false,
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(subtitle),
    ),
  );
}
