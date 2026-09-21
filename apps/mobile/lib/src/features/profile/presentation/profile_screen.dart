import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../auth/presentation/cubit/session_cubit.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/brand_colors.dart';
import '../../onboarding/data/models/user_availability_dto.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/error_state.dart';
import '../data/models/user_rating_dto.dart';
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
          return ErrorState(
            message: state.message,
            onRetry: () => context.read<ProfileCubit>().load(),
          );
        }

        final vm = state as ProfileLoaded;

        return RefreshIndicator(
          onRefresh: () => context.read<ProfileCubit>().load(),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              children: [
              Row(
                children: [
                  Text(
                    'Perfil',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => context.push(Routes.publicProfile),
                    icon: const Icon(AppIcons.eyeOn),
                    tooltip: 'Ver como me ven',
                  ),
                  IconButton(
                    onPressed: () => context.push(Routes.settings),
                    icon: const Icon(AppIcons.sliders),
                    tooltip: 'Ajustes',
                  ),
                ],
              ),
              const SizedBox(height: 8),
              _SettingsMenu(vm: vm),
              const SizedBox(height: 16),
              _ProfileHero(vm: vm),
              if (!vm.onboardingStatus.isComplete) ...[
                const SizedBox(height: 16),
                _OnboardingBanner(
                  pendingCount: vm.onboardingStatus.pendingSteps.length,
                ),
              ],
              const SizedBox(height: 20),
              _RecentForm(vm: vm),
              const SizedBox(height: 16),
              const _UnsupportedCard(
                title: 'Logros',
                message: 'Todavía no participás ni organizás torneos.',
              ),
              const SizedBox(height: 16),
              _StatsGrid(vm: vm),
              const SizedBox(height: 16),
              _RatingSummary(vm: vm),
              const SizedBox(height: 16),
              _GameSummary(vm: vm),
              _AvailabilitySummary(vm: vm),
              const SizedBox(height: 16),
              _TournamentsSection(vm: vm),
              const SizedBox(height: 20),
              _LogoutButton(),
              ],
            ),
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
                Icon(AppIcons.target, size: 15, color: scheme.primary),
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

final class _StatsGrid extends StatelessWidget {
  const _StatsGrid({required this.vm});

  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final elo = vm.ratings.isNotEmpty
        ? vm.ratings.first.rating.toStringAsFixed(0)
        : '—';
    final winPct = '${(vm.stats.winRate * 100).round()}%';

    final cards = [
      _StatCard(
        value: vm.stats.matchesPlayed.toString(),
        label: 'Jugadas',
        scheme: scheme,
      ),
      _StatCard(value: winPct, label: 'Victorias', scheme: scheme),
      _StatCard(value: elo, label: 'ELO', scheme: scheme),
      _StatCard(
        value: vm.ratings.isNotEmpty ? vm.ratings.first.points.toString() : '0',
        label: 'Puntos',
        scheme: scheme,
      ),
    ];
    return LayoutBuilder(
      builder: (context, constraints) => Wrap(
        spacing: 10,
        runSpacing: 10,
        children: cards
            .map(
              (card) =>
                  SizedBox(width: (constraints.maxWidth - 10) / 2, child: card),
            )
            .toList(),
      ),
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

final class _RatingSummary extends StatelessWidget {
  const _RatingSummary({required this.vm});
  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final rating = vm.ratings.isEmpty ? null : vm.ratings.first.rating;
    final points = vm.ratings.isEmpty ? 0 : vm.ratings.first.points;
    final matchingEntries = vm.leaderboard.where(
      (entry) => entry.userId == vm.me.id,
    );
    final rank = matchingEntries.isEmpty ? null : matchingEntries.first.rank;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ELO ACTUAL',
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 3),
          Row(
            children: [
              Text(
                rating?.toStringAsFixed(0) ?? '—',
                style: const TextStyle(
                  fontSize: 38,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const Spacer(),
              Icon(
                AppIcons.scoreboard,
                size: 42,
                color: scheme.primary.withValues(alpha: .45),
              ),
            ],
          ),
          Row(
            children: [
              Text(
                'Puntos $points',
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 13),
              ),
              const SizedBox(width: 16),
              Text(
                rank == null ? 'Ranking: —' : 'Ranking: #$rank',
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (vm.history.isNotEmpty)
            SizedBox(
              height: 74,
              width: double.infinity,
              child: CustomPaint(
                painter: _EloChartPainter(
                  history: vm.history,
                  lineColor: scheme.primary,
                  gridColor: scheme.outlineVariant,
                ),
              ),
            )
          else
            Text(
              'Sin historial de ELO todavía',
              style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 13),
            ),
          const SizedBox(height: 10),
          Divider(color: scheme.outlineVariant),
          Row(
            children: [
              Icon(AppIcons.target, size: 17, color: scheme.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  vm.leaderboard.isEmpty
                      ? 'Ranking disponible cuando haya resultados'
                      : 'Ranking activo en tu categoría',
                  style: TextStyle(color: scheme.onSurfaceVariant),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

final class _GameSummary extends StatelessWidget {
  const _GameSummary({required this.vm});
  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final category = vm.sportProfiles.isEmpty
        ? 'Sin categoría'
        : (vm.sportProfiles.first.categoryLabel ?? 'Sin categoría');
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'MI JUEGO',
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _GameValue(label: 'Categoría', value: category),
              ),
              Expanded(
                child: _GameValue(
                  label: 'Lado',
                  value: _sideLabel(
                    vm.sportProfiles.isEmpty
                        ? null
                        : vm.sportProfiles.first.sidePreference.name,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _GameValue(
                  label: 'Mano',
                  value: vm.playerProfile.dominantHandLabel,
                ),
              ),
              Expanded(
                child: _GameValue(
                  label: 'Horarios',
                  value: '${vm.availability.length} configurados',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

final class _RecentForm extends StatelessWidget {
  const _RecentForm({required this.vm});

  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _ProfileCard(
      title: 'FORMA RECIENTE',
      child: vm.history.isEmpty
          ? Text(
              'Los resultados ganados y perdidos todavía no están disponibles.',
              style: TextStyle(color: scheme.onSurfaceVariant),
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cambios recientes de ELO',
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final item in vm.history.take(5))
                      _EloDelta(delta: item.newRating - item.previousRating),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'La API aún no expone el resultado de cada partido.',
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
    );
  }
}

final class _EloDelta extends StatelessWidget {
  const _EloDelta({required this.delta});

  final double delta;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final positive = delta >= 0;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: (positive ? scheme.primary : scheme.error).withValues(
          alpha: .14,
        ),
        borderRadius: BorderRadius.circular(9),
      ),
      child: Text(
        '${positive ? '+' : ''}${delta.round()} ELO',
        style: TextStyle(
          color: positive ? scheme.primary : scheme.error,
          fontWeight: FontWeight.w800,
          fontSize: 12,
        ),
      ),
    );
  }
}

final class _AvailabilitySummary extends StatelessWidget {
  const _AvailabilitySummary({required this.vm});

  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _ProfileCard(
      title: 'DISPONIBILIDAD',
      child: vm.availability.isEmpty
          ? Text(
              'Todavía no configuraste horarios para jugar.',
              style: TextStyle(color: scheme.onSurfaceVariant),
            )
          : Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final slot in vm.availability.take(8))
                  Chip(
                    label: Text(
                      '${_dayLabel(slot.dayOfWeek)} · ${_slotLabel(slot.slot)}',
                    ),
                    visualDensity: VisualDensity.compact,
                  ),
              ],
            ),
    );
  }
}

final class _TournamentsSection extends StatelessWidget {
  const _TournamentsSection({required this.vm});

  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _ProfileCard(
      title: 'MIS TORNEOS',
      child: vm.tournamentsLoadFailed
          ? Text(
              'No pudimos cargar tus torneos. Intentá actualizar el perfil.',
              style: TextStyle(color: scheme.onSurfaceVariant),
            )
          : vm.myTournaments.isEmpty
          ? Text(
              'No tenés torneos todavía.',
              style: TextStyle(color: scheme.onSurfaceVariant),
            )
          : Column(
              children: [
                for (final item in vm.myTournaments.take(3))
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      item.tournament.name,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    subtitle: Text(
                      item.isOrganizer
                          ? 'Organizador · ${item.tournament.categoryName}'
                          : '${_tournamentStatus(item.registrationStatus)} · '
                                '${item.tournament.categoryName}',
                    ),
                    trailing: const Icon(AppIcons.chevronRight),
                    onTap: () => context.push(
                      Routes.tournamentDetail(item.tournament.id),
                    ),
                  ),
              ],
            ),
    );
  }
}

final class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

final class _UnsupportedCard extends StatelessWidget {
  const _UnsupportedCard({required this.title, required this.message});

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) => _ProfileCard(
    title: title,
    child: Text(
      message,
      style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
    ),
  );
}

final class _EloChartPainter extends CustomPainter {
  const _EloChartPainter({
    required this.history,
    required this.lineColor,
    required this.gridColor,
  });

  final List<UserRatingHistoryItemDto> history;
  final Color lineColor;
  final Color gridColor;

  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = gridColor
      ..strokeWidth = 1;
    for (var i = 1; i < 4; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    final values = [...history.reversed.take(8).map((item) => item.newRating)];
    if (values.length < 2) return;
    final min = values.reduce((a, b) => a < b ? a : b);
    final max = values.reduce((a, b) => a > b ? a : b);
    final range = (max - min).abs() < 1 ? 1 : (max - min).abs();
    final linePaint = Paint()
      ..color = lineColor
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final path = Path();
    for (var i = 0; i < values.length; i++) {
      final x = size.width * i / (values.length - 1);
      final y = size.height - ((values[i] - min) / range * size.height);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    canvas.drawPath(path, linePaint);
  }

  @override
  bool shouldRepaint(_EloChartPainter oldDelegate) =>
      oldDelegate.history != history ||
      oldDelegate.lineColor != lineColor ||
      oldDelegate.gridColor != gridColor;
}

final class _GameValue extends StatelessWidget {
  const _GameValue({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: TextStyle(
          color: Theme.of(context).colorScheme.onSurfaceVariant,
          fontSize: 12,
        ),
      ),
      const SizedBox(height: 3),
      Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
    ],
  );
}

String _sideLabel(String? raw) => switch (raw?.toUpperCase()) {
  'LEFT' => 'Revés',
  'ANY' => 'Ambos lados',
  _ => 'Drive',
};

String _dayLabel(DayOfWeek day) => switch (day) {
  DayOfWeek.monday => 'Lun',
  DayOfWeek.tuesday => 'Mar',
  DayOfWeek.wednesday => 'Mié',
  DayOfWeek.thursday => 'Jue',
  DayOfWeek.friday => 'Vie',
  DayOfWeek.saturday => 'Sáb',
  DayOfWeek.sunday => 'Dom',
};

String _slotLabel(AvailabilitySlot slot) => switch (slot) {
  AvailabilitySlot.morning => 'Mañana',
  AvailabilitySlot.afternoon => 'Tarde',
  AvailabilitySlot.evening => 'Noche',
};

String _tournamentStatus(String? status) => switch (status) {
  'CONFIRMED' => 'Confirmado',
  'PENDING' => 'Pendiente',
  _ => 'Sin inscripción',
};

final class _SettingsMenu extends StatelessWidget {
  const _SettingsMenu({required this.vm});

  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final items = <_SettingsItem>[
      _SettingsItem(
        icon: AppIcons.person,
        label: 'Editar perfil',
        onTap: () => context.push(Routes.onboarding),
      ),
      _SettingsItem(
        icon: AppIcons.racquetSport,
        label: 'Mis deportes',
        onTap: () => context.push(Routes.mySports),
      ),
      _SettingsItem(
        icon: AppIcons.target,
        label: 'Historial de ELO',
        onTap: () => showProfileEloSheet(context, vm),
      ),
      _SettingsItem(icon: AppIcons.pin, label: 'Clubes favoritos', onTap: null),
      _SettingsItem(
        icon: AppIcons.sliders,
        label: 'Ajustes',
        onTap: () => context.push(Routes.settings),
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
            _SettingsRow(item: items[i], showDivider: i < items.length - 1),
        ],
      ),
    );
  }
}

final class _SettingsItem {
  const _SettingsItem({required this.icon, required this.label, this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback? onTap;
}

final class _SettingsRow extends StatelessWidget {
  const _SettingsRow({required this.item, required this.showDivider});

  final _SettingsItem item;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final content = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      child: Row(
        children: [
          Icon(
            item.icon,
            size: 19,
            color: item.onTap == null
                ? scheme.onSurfaceVariant.withValues(alpha: .55)
                : scheme.onSurfaceVariant,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              item.label,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: item.onTap == null
                    ? scheme.onSurfaceVariant
                    : scheme.onSurface,
              ),
            ),
          ),
          Icon(
            item.onTap == null ? AppIcons.lock : AppIcons.chevronRight,
            size: 18,
            color: scheme.onSurfaceVariant.withValues(alpha: 0.75),
          ),
        ],
      ),
    );
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: item.onTap,
        child: Column(
          children: [
            content,
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
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Sesión cerrada.')));
        }
      },
      style: TextButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        foregroundColor: scheme.error,
      ),
      icon: const Icon(AppIcons.signOut, size: 20),
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
          Icon(AppIcons.sparkle, color: scheme.primary, size: 22),
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
