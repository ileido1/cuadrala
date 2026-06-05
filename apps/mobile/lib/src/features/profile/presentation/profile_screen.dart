import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../auth/presentation/cubit/session_cubit.dart';
import '../../../core/theme/brand_colors.dart';
import '../../../router/routes.dart';
import 'cubit/profile_cubit.dart';
import 'cubit/profile_state.dart';
import 'widgets/profile_elo_sheet.dart';

final class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    context.read<ProfileCubit>().load();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ProfileCubit, ProfileState>(
      builder: (context, state) {
        if (state is ProfileInitial || state is ProfileLoading) {
          return const Center(child: CircularProgressIndicator());
        }
        if (state is ProfileFailure) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(state.message),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () => context.read<ProfileCubit>().load(),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            ),
          );
        }

        final vm = state as ProfileLoaded;

        return RefreshIndicator(
          onRefresh: () => context.read<ProfileCubit>().load(),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            children: [
              _ProfileHero(vm: vm),
              if (!vm.onboardingStatus.isComplete) ...[
                const SizedBox(height: 16),
                _OnboardingBanner(
                  pendingCount: vm.onboardingStatus.pendingSteps.length,
                ),
              ],
              const SizedBox(height: 20),
              _StatsRow(vm: vm),
              const SizedBox(height: 16),
              _SettingsMenu(vm: vm),
              const SizedBox(height: 20),
              _LogoutButton(),
            ],
          ),
        );
      },
    );
  }
}

final class _ProfileHero extends StatelessWidget {
  const _ProfileHero({required this.vm});

  final ProfileLoaded vm;

  String? _categoryLabel() {
    for (final profile in vm.sportProfiles) {
      final label = profile.categoryLabel;
      if (label != null && label.isNotEmpty) return label;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final category = _categoryLabel();
    final greenBg = scheme.primary.withValues(alpha: 0.15);

    return Column(
      children: [
        Container(
          width: 84,
          height: 84,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: scheme.primary,
            border: Border.all(color: BrandColors.limeAccent, width: 3),
          ),
          alignment: Alignment.center,
          child: Text(
            _initials(vm.me.name),
            style: const TextStyle(
              fontSize: 34,
              fontWeight: FontWeight.w800,
              color: BrandColors.onHero,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          vm.me.name,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: scheme.onSurface,
          ),
        ),
        if (category != null) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              color: greenBg,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.adjust, size: 15, color: scheme.primary),
                const SizedBox(width: 6),
                Text(
                  'Categoría $category',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: scheme.primary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  static String _initials(String name) {
    final raw = name.trim();
    if (raw.isEmpty) return '?';
    final parts = raw.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts.last.characters.first)
        .toUpperCase();
  }
}

final class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.vm});

  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final elo = vm.ratings.isNotEmpty
        ? vm.ratings.first.rating.toStringAsFixed(0)
        : '—';
    final winPct = '${(vm.stats.winRate * 100).round()}%';

    return Row(
      children: [
        Expanded(
          child: _StatCard(
            value: vm.stats.matchesPlayed.toString(),
            label: 'Jugadas',
            scheme: scheme,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            value: winPct,
            label: 'Victorias',
            scheme: scheme,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            value: elo,
            label: 'ELO',
            scheme: scheme,
          ),
        ),
      ],
    );
  }
}

final class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.value,
    required this.label,
    required this.scheme,
  });

  final String value;
  final String label;
  final ColorScheme scheme;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: scheme.surface,
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 22,
              color: scheme.onSurface,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontWeight: FontWeight.w500,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

final class _SettingsMenu extends StatelessWidget {
  const _SettingsMenu({required this.vm});

  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final items = <_SettingsItem>[
      _SettingsItem(
        icon: Icons.person_outline,
        label: 'Editar perfil',
        onTap: () => context.push(Routes.onboarding),
      ),
      _SettingsItem(
        icon: Icons.adjust,
        label: 'Historial de ELO',
        onTap: () => showProfileEloSheet(context, vm),
      ),
      _SettingsItem(
        icon: Icons.location_on_outlined,
        label: 'Clubes favoritos',
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Próximamente.')),
          );
        },
      ),
      _SettingsItem(
        icon: Icons.tune,
        label: 'Ajustes',
        onTap: () => context.push(Routes.notificationPrefs),
      ),
    ];

    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++)
            _SettingsRow(
              item: items[i],
              showDivider: i < items.length - 1,
            ),
        ],
      ),
    );
  }
}

final class _SettingsItem {
  const _SettingsItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
}

final class _SettingsRow extends StatelessWidget {
  const _SettingsRow({
    required this.item,
    required this.showDivider,
  });

  final _SettingsItem item;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: item.onTap,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
              child: Row(
                children: [
                  Icon(
                    item.icon,
                    size: 19,
                    color: scheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      item.label,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: scheme.onSurface,
                      ),
                    ),
                  ),
                  Icon(
                    Icons.chevron_right,
                    size: 18,
                    color: scheme.onSurfaceVariant.withValues(alpha: 0.75),
                  ),
                ],
              ),
            ),
            if (showDivider)
              Divider(
                height: 1,
                thickness: 1,
                color: scheme.outlineVariant.withValues(alpha: 0.6),
              ),
          ],
        ),
      ),
    );
  }
}

final class _LogoutButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return TextButton.icon(
      onPressed: () async {
        await context.read<SessionCubit>().logout();
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Sesión cerrada.')),
          );
        }
      },
      style: TextButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        foregroundColor: scheme.error,
      ),
      icon: const Icon(Icons.logout, size: 20),
      label: const Text(
        'Cerrar sesión',
        style: TextStyle(fontWeight: FontWeight.w700),
      ),
    );
  }
}

final class _OnboardingBanner extends StatelessWidget {
  const _OnboardingBanner({required this.pendingCount});

  final int pendingCount;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: scheme.primary.withValues(alpha: 0.12),
        border: Border.all(color: scheme.primary.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Icon(Icons.auto_awesome, color: scheme.primary, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Completa tu perfil',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    color: scheme.onSurface,
                  ),
                ),
                Text(
                  pendingCount == 1
                      ? 'Te falta 1 paso para mejores recomendaciones.'
                      : 'Te faltan $pendingCount pasos para mejores recomendaciones.',
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () => context.push(Routes.onboarding),
            child: const Text('Continuar'),
          ),
        ],
      ),
    );
  }
}

/// Public for tests — initials helper used by ELO sheet rows.
String profileInitials(String name) => _ProfileHero._initials(name);
