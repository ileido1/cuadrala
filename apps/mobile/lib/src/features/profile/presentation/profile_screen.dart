import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../auth/presentation/cubit/session_cubit.dart';
import '../../../core/formatting/id_preview.dart';
import '../../../core/sport/sport_classification.dart';
import '../../../router/routes.dart';
import '../../onboarding/data/models/player_sport_profile_dto.dart';
import '../../catalog/data/models/sport_dto.dart';
import 'cubit/profile_cubit.dart';
import 'cubit/profile_state.dart';

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
        final scheme = Theme.of(context).colorScheme;

        return RefreshIndicator(
          onRefresh: () => context.read<ProfileCubit>().load(),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
            children: [
              const SizedBox(height: 6),
              _ProfileHeader(vm: vm),
              const SizedBox(height: 14),
              if (!vm.onboardingStatus.isComplete)
                _OnboardingBanner(
                  pendingCount: vm.onboardingStatus.pendingSteps.length,
                ),
              if (!vm.onboardingStatus.isComplete) const SizedBox(height: 16),
              _StatsStrip(vm: vm),
              const SizedBox(height: 18),
              _Top5Card(vm: vm),
              if (vm.sportProfiles.isNotEmpty) ...[
                const SizedBox(height: 18),
                const _SectionTitle(title: 'Mis deportes'),
                const SizedBox(height: 10),
                _SportProfileCards(vm: vm),
              ],
              const SizedBox(height: 18),
              const _SectionTitle(title: 'Datos técnicos'),
              const SizedBox(height: 10),
              _TechCards(vm: vm),
              const SizedBox(height: 18),
              TextButton.icon(
                onPressed: () async {
                  await context.read<SessionCubit>().logout();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Sesión cerrada.')),
                    );
                  }
                },
                style: TextButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  foregroundColor: scheme.error,
                  backgroundColor: scheme.error.withValues(alpha: 0.06),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: const Icon(Icons.logout),
                label: const Text('Cerrar sesión', style: TextStyle(fontWeight: FontWeight.w900)),
              ),
            ],
          ),
        );
      },
    );
  }
}

final class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w900,
          ),
    );
  }
}

final class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.vm});

  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    final sportName = () {
      if (vm.sportProfiles.isEmpty) return null;
      final sportId = vm.sportProfiles.first.sportId;
      return vm.sports.firstWhere(
        (s) => s.id == sportId,
        orElse: () => const SportDto(id: '', code: '', name: ''),
      ).name;
    }();
    final categoryShort = () {
      for (final profile in vm.sportProfiles) {
        final label = profile.categoryLabel;
        if (label != null && label.isNotEmpty) return label;
      }
      if (vm.ratings.isNotEmpty) {
        return 'Cat ${idPreview(vm.ratings.first.categoryId)}';
      }
      return null;
    }();

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 18),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(40)),
        border: Border(
          bottom: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.6)),
        ),
      ),
      child: Stack(
        children: [
          Align(
            alignment: Alignment.topRight,
            child: IconButton(
              onPressed: () => context.push(Routes.onboarding),
              icon: const Icon(Icons.settings_outlined),
              tooltip: 'Editar perfil',
              style: IconButton.styleFrom(
                backgroundColor: scheme.surfaceContainerHighest.withValues(alpha: 0.7),
                foregroundColor: scheme.onSurface,
                padding: const EdgeInsets.all(10),
              ),
            ),
          ),
          Column(
            children: [
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: scheme.surface,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.10),
                      blurRadius: 16,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: CircleAvatar(
                  radius: 44,
                  backgroundColor: scheme.primary.withValues(alpha: 0.14),
                  child: Text(
                    _initials(vm.me.name),
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 26,
                      color: scheme.primary,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                vm.me.name,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 6),
              Wrap(
                alignment: WrapAlignment.center,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 8,
                children: [
                  if (sportName != null && sportName.trim().isNotEmpty)
                    Text(
                      sportName,
                      style: TextStyle(
                        color: scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  if (categoryShort != null)
                    Text(
                      '• $categoryShort',
                      style: TextStyle(
                        color: scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  if (vm.me.subscriptionType != 'FREE')
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: scheme.tertiary,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        'PRO',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
                          color: scheme.onTertiary,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  static String _initials(String name) {
    final raw = name.trim();
    if (raw.isEmpty) return '?';
    final parts = raw.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts.last.characters.first).toUpperCase();
  }
}

final class _StatsStrip extends StatelessWidget {
  const _StatsStrip({required this.vm});

  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final elo = vm.ratings.isNotEmpty ? vm.ratings.first.rating.toStringAsFixed(0) : '—';
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.55),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.6)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _MiniStat(
              icon: Icons.show_chart,
              iconColor: scheme.primary,
              value: vm.stats.matchesPlayed.toString(),
              label: 'JUGADOS',
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _MiniStat(
              icon: Icons.emoji_events_outlined,
              iconColor: scheme.tertiary,
              value: '${(vm.stats.winRate * 100).toStringAsFixed(0)}%',
              label: 'VICTORIAS',
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _MiniStat(
              icon: Icons.military_tech_outlined,
              iconColor: scheme.primary,
              value: elo,
              label: 'ELO ACTUAL',
              highlighted: true,
            ),
          ),
        ],
      ),
    );
  }
}

final class _MiniStat extends StatelessWidget {
  const _MiniStat({
    required this.icon,
    required this.iconColor,
    required this.value,
    required this.label,
    this.highlighted = false,
  });

  final IconData icon;
  final Color iconColor;
  final String value;
  final String label;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: highlighted ? scheme.primary.withValues(alpha: 0.10) : scheme.surface,
        border: Border.all(color: highlighted ? scheme.primary.withValues(alpha: 0.20) : scheme.outlineVariant.withValues(alpha: 0.6)),
      ),
      child: Column(
        children: [
          Icon(icon, color: iconColor, size: 18),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontWeight: FontWeight.w800,
              fontSize: 11,
              letterSpacing: .4,
            ),
          ),
        ],
      ),
    );
  }
}

final class _Top5Card extends StatelessWidget {
  const _Top5Card({required this.vm});

  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Top 5 • ${vm.ratings.isNotEmpty ? 'Categoría' : 'Tu categoría'}',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w900,
              ),
        ),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            color: scheme.surface,
            border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.6)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 14,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: vm.leaderboard.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: Text('Sin datos de clasificación')),
                )
              : Column(
                  children: [
                    for (int i = 0; i < vm.leaderboard.length; i++) ...[
                      if (i > 0) const Divider(height: 1),
                      _TopRow(
                        pos: vm.leaderboard[i].rank,
                        initials: _ProfileHeader._initials(vm.leaderboard[i].displayName),
                        name: vm.leaderboard[i].displayName,
                        elo: vm.leaderboard[i].rating.round(),
                        highlighted: vm.leaderboard[i].userId == vm.me.id,
                      ),
                    ],
                  ],
                ),
        ),
      ],
    );
  }
}

final class _TopRow extends StatelessWidget {
  const _TopRow({
    required this.pos,
    required this.initials,
    required this.name,
    required this.elo,
    this.highlighted = false,
  });

  final int pos;
  final String initials;
  final String name;
  final int elo;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      color: highlighted ? scheme.primary.withValues(alpha: 0.06) : null,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          SizedBox(
            width: 22,
            child: Text(
              '$pos',
              style: TextStyle(
                color: pos == 1 ? scheme.tertiary : scheme.onSurfaceVariant,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          CircleAvatar(
            radius: 16,
            backgroundColor: scheme.surfaceContainerHighest,
            child: Text(
              initials,
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              name,
              style: TextStyle(
                fontWeight: FontWeight.w900,
                color: highlighted ? scheme.primary : scheme.onSurface,
              ),
            ),
          ),
          Text(
            '$elo',
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
        ],
      ),
    );
  }
}

final class _SportProfileCards extends StatelessWidget {
  const _SportProfileCards({required this.vm});

  final ProfileLoaded vm;

  SportDto? _sportFor(String sportId) {
    for (final s in vm.sports) {
      if (s.id == sportId) return s;
    }
    return null;
  }

  IconData _iconForSport(SportDto sport) {
    switch (sport.code.toUpperCase()) {
      case 'PADEL':
      case 'TENNIS':
      case 'PICKLEBALL':
        return Icons.sports_tennis;
      case 'FOOTBALL5':
        return Icons.sports_soccer;
      case 'BASKETBALL3X3':
        return Icons.sports_basketball;
      case 'VOLLEY_BEACH':
        return Icons.sports_volleyball;
      default:
        return Icons.sports;
    }
  }

  String _sideLabel(SidePreference side) => switch (side) {
        SidePreference.right => 'Drive',
        SidePreference.left => 'Revés',
        SidePreference.any => 'Multi',
      };

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        for (final profile in vm.sportProfiles) ...[
          Builder(
            builder: (context) {
              final sport = _sportFor(profile.sportId);
              final sportName = sport?.name ?? 'Deporte';
              final isRacket =
                  sport != null && isRacketSportCode(sport.code);
              final categoryLabel = profile.categoryLabel;

              return Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: scheme.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: scheme.outlineVariant),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: scheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        sport != null ? _iconForSport(sport) : Icons.sports,
                        color: scheme.primary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            sportName,
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(fontWeight: FontWeight.w900),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            categoryLabel ??
                                (isRacket ? 'Sin categoría' : 'Sin nivel'),
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w900,
                                  color: scheme.primary,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            isRacket
                                ? 'Lado: ${_sideLabel(profile.sidePreference)}'
                                : 'Nivel ${profile.skillLevel.toStringAsFixed(1)}',
                            style: TextStyle(
                              color: scheme.onSurfaceVariant,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ],
    );
  }
}

final class _TechCards extends StatelessWidget {
  const _TechCards({required this.vm});

  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final side = vm.sportProfiles.isNotEmpty ? vm.sportProfiles.first.sidePreference : SidePreference.any;

    String sideLabel(SidePreference s) => switch (s) {
          SidePreference.right => 'Derecha',
          SidePreference.left => 'Revés',
          SidePreference.any => 'Multi',
        };

    return Row(
      children: [
        Expanded(
          child: _TechCard(
            title: 'BRAZO',
            value: vm.playerProfile.dominantHandLabel,
            icon: Icons.sports_handball_outlined,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _TechCard(
            title: 'LADO PREF.',
            value: sideLabel(side),
            icon: Icons.swap_horiz,
          ),
        ),
      ],
    );
  }
}

final class _TechCard extends StatelessWidget {
  const _TechCard({required this.title, required this.value, required this.icon});

  final String title;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: scheme.surface,
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: scheme.onSurfaceVariant),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  color: scheme.onSurfaceVariant,
                  fontWeight: FontWeight.w900,
                  fontSize: 11,
                  letterSpacing: .5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
          ),
        ],
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
        color: scheme.primaryContainer,
        border: Border.all(color: scheme.primary.withValues(alpha: .4)),
      ),
      child: Row(
        children: [
          Icon(Icons.auto_awesome, color: scheme.onPrimaryContainer),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Completa tu perfil',
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    color: scheme.onPrimaryContainer,
                  ),
                ),
                Text(
                  pendingCount == 1
                      ? 'Te falta 1 paso para mejores recomendaciones.'
                      : 'Te faltan $pendingCount pasos para mejores recomendaciones.',
                  style: TextStyle(color: scheme.onPrimaryContainer),
                ),
              ],
            ),
          ),
          FilledButton(
            onPressed: () => context.push(Routes.onboarding),
            child: const Text('Continuar'),
          ),
        ],
      ),
    );
  }
}
