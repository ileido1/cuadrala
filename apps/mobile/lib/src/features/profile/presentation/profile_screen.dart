import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_icons.dart';
import '../../../core/theme/brand_colors.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/error_state.dart';
import '../../onboarding/data/models/user_availability_dto.dart';
import 'cubit/profile_cubit.dart';
import 'cubit/profile_state.dart';
import 'widgets/profile_elo_sheet.dart';

final class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _formOpen = false;

  @override
  void initState() {
    super.initState();
    context.read<ProfileCubit>().load();
  }

  @override
  Widget build(BuildContext context) => BlocBuilder<ProfileCubit, ProfileState>(
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
      return Material(
        color: Colors.transparent,
        child: RefreshIndicator(
          onRefresh: () => context.read<ProfileCubit>().load(),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 52, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _Header(vm: vm),
                const SizedBox(height: 16),
                _Identity(vm: vm),
                if (!vm.onboardingStatus.isComplete) ...[
                  const SizedBox(height: 14),
                  _CompletionHint(
                    pendingCount: vm.onboardingStatus.pendingSteps.length,
                  ),
                ],
                const SizedBox(height: 18),
                _EloCard(vm: vm),
                const SizedBox(height: 18),
                _Stats(vm: vm),
                const SizedBox(height: 18),
                _RecentForm(
                  vm: vm,
                  open: _formOpen,
                  onTap: () => setState(() => _formOpen = !_formOpen),
                ),
                const SizedBox(height: 18),
                const _SectionLabel('Mi juego'),
                const SizedBox(height: 8),
                _GameGrid(vm: vm),
                const SizedBox(height: 18),
                const _SectionLabel('Torneos'),
                const SizedBox(height: 8),
                _Tournaments(vm: vm),
                const SizedBox(height: 18),
                const _SectionLabel('Logros'),
                const SizedBox(height: 8),
                const _Achievements(),
                const SizedBox(height: 18),
                const _SectionLabel('Disponibilidad'),
                const SizedBox(height: 8),
                _AvailabilityGrid(
                  availability: vm.availability,
                  showHint: true,
                ),
              ],
            ),
          ),
        ),
      );
    },
  );
}

final class _Header extends StatelessWidget {
  const _Header({required this.vm});
  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Text(
        'Perfil',
        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
          fontSize: 27,
          fontWeight: FontWeight.w800,
          letterSpacing: -.5,
        ),
      ),
      const Spacer(),
      _HeaderButton(
        icon: AppIcons.eyeOn,
        tooltip: 'Ver como me ven',
        onPressed: () => context.push(Routes.publicProfile),
      ),
      const SizedBox(width: 8),
      _HeaderButton(
        icon: AppIcons.sliders,
        tooltip: 'Ajustes',
        onPressed: () => context.push(Routes.settings),
      ),
    ],
  );
}

final class _HeaderButton extends StatelessWidget {
  const _HeaderButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });
  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: tooltip,
    child: Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onPressed,
        child: SizedBox(width: 38, height: 38, child: Icon(icon, size: 18)),
      ),
    ),
  );
}

final class _Identity extends StatelessWidget {
  const _Identity({required this.vm});
  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final location = vm.location?.label?.trim();
    final category = _category(vm);
    return Row(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            ProfileAvatar(
              initials: profileInitials(vm.me.name),
              avatarUrl: vm.playerProfile.avatarUrl,
              size: 66,
              borderWidth: 2.5,
            ),
            Positioned(
              right: -2,
              bottom: -2,
              child: Semantics(
                key: const ValueKey('profile-avatar-camera-unavailable'),
                enabled: false,
                label:
                    'Cambiar foto de perfil no disponible. La carga de fotos no está disponible todavía.',
                child: ExcludeSemantics(
                  child: Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: scheme.surface,
                      border: Border.all(
                        color: Theme.of(context).scaffoldBackgroundColor,
                        width: 2,
                      ),
                    ),
                    child: const Icon(AppIcons.camera, size: 12),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                vm.me.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -.3,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                location?.isNotEmpty == true
                    ? location!
                    : (category ?? 'Perfil de jugador'),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12.5,
                  color: scheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 8),
              Semantics(
                button: true,
                label: 'Ver como me ven',
                child: InkWell(
                  borderRadius: BorderRadius.circular(999),
                  onTap: () => context.push(Routes.publicProfile),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 11,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: scheme.primary.withValues(alpha: .15),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(AppIcons.eyeOn, size: 14, color: scheme.primary),
                        const SizedBox(width: 6),
                        Text(
                          'Ver como me ven',
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: scheme.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

final class _EloCard extends StatelessWidget {
  const _EloCard({required this.vm});
  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final rating = vm.ratings.isEmpty ? null : vm.ratings.first.rating;
    // The API returns history newest-first. Keep only the available recent
    // entries and reverse that subset so the sparkline reads left-to-right.
    final recentHistory = vm.history.take(8).toList();
    final values = recentHistory.reversed
        .take(8)
        .map((item) => item.newRating)
        .toList();
    final delta = recentHistory.isEmpty
        ? null
        : recentHistory.first.newRating - recentHistory.last.previousRating;
    final rank = vm.leaderboard
        .where((entry) => entry.userId == vm.me.id)
        .map((entry) => entry.rank)
        .cast<int?>()
        .firstOrNull;
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('ELO ACTUAL', style: _labelStyle(scheme)),
                    const SizedBox(height: 4),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          rating?.toStringAsFixed(0) ?? '—',
                          style: const TextStyle(
                            fontSize: 40,
                            height: 1,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -1.5,
                          ),
                        ),
                        if (delta != null) ...[
                          const SizedBox(width: 8),
                          _DeltaPill(delta: delta),
                        ],
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      recentHistory.isEmpty
                          ? 'Sin historial de ELO disponible'
                          : 'Cambio en el historial reciente',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(
                width: 96,
                height: 38,
                child: values.length >= 2
                    ? CustomPaint(
                        painter: _Sparkline(
                          values: values,
                          lineColor: scheme.primary,
                          fillColor: scheme.primary.withValues(alpha: .14),
                        ),
                      )
                    : Center(
                        child: Icon(
                          AppIcons.scoreboard,
                          color: scheme.onSurfaceVariant.withValues(alpha: .45),
                          size: 30,
                        ),
                      ),
              ),
            ],
          ),
          const SizedBox(height: 13),
          Divider(height: 1, color: scheme.outlineVariant),
          Semantics(
            button: true,
            label: 'Historial de ELO',
            child: InkWell(
              key: const ValueKey('profile-elo-history'),
              onTap: () => showProfileEloSheet(context, vm),
              child: Padding(
                padding: const EdgeInsets.only(top: 13),
                child: Row(
                  children: [
                    Icon(AppIcons.target, size: 16, color: scheme.primary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        rank == null || vm.leaderboard.isEmpty
                            ? 'Historial de ELO'
                            : 'Puesto #$rank de ${vm.leaderboard.length}',
                        style: TextStyle(
                          fontSize: 13.5,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                    Icon(
                      AppIcons.chevronRight,
                      size: 17,
                      color: scheme.onSurfaceVariant,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

final class _Stats extends StatelessWidget {
  const _Stats({required this.vm});
  final ProfileLoaded vm;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: _Stat(value: '${vm.stats.matchesPlayed}', label: 'Jugadas'),
      ),
      const SizedBox(width: 10),
      Expanded(
        child: _Stat(
          value: '${(vm.stats.winRate * 100).round()}%',
          label: 'Victorias',
        ),
      ),
      const SizedBox(width: 10),
      Expanded(
        child: _Stat(
          value: '—',
          label: 'Racha',
          semanticHint: 'La racha no está disponible todavía',
        ),
      ),
    ],
  );
}

final class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label, this.semanticHint});
  final String value;
  final String label;
  final String? semanticHint;
  @override
  Widget build(BuildContext context) => Semantics(
    label: semanticHint,
    child: _Card(
      padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 8),
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 11.5,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    ),
  );
}

final class _RecentForm extends StatelessWidget {
  const _RecentForm({
    required this.vm,
    required this.open,
    required this.onTap,
  });
  final ProfileLoaded vm;
  final bool open;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _Card(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          Semantics(
            button: true,
            expanded: open,
            label: 'Forma reciente',
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.vertical(
                top: const Radius.circular(16),
                bottom: open ? Radius.zero : const Radius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Forma reciente',
                            style: TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            vm.history.isEmpty
                                ? 'Resultados detallados no disponibles'
                                : '${vm.history.length} cambios de ELO recientes',
                            style: TextStyle(
                              fontSize: 12.5,
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    ...List.generate(
                      5,
                      (_) => Padding(
                        padding: const EdgeInsets.only(left: 4),
                        child: _FormPill(result: null),
                      ),
                    ),
                    AnimatedRotation(
                      turns: open ? .5 : 0,
                      duration: const Duration(milliseconds: 180),
                      child: Icon(
                        AppIcons.chevronDown,
                        size: 17,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (open) ...[
            Divider(height: 1, color: scheme.outlineVariant),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Text(
                'La API actual no expone rival, marcador ni resultados de los últimos partidos.',
                style: TextStyle(
                  fontSize: 12.5,
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

final class _FormPill extends StatelessWidget {
  const _FormPill({required this.result});
  final bool? result;
  @override
  Widget build(BuildContext context) => Container(
    width: 26,
    height: 26,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: result == true
          ? BrandColors.limeAccent
          : Theme.of(context).colorScheme.surfaceContainerHigh,
      borderRadius: BorderRadius.circular(9),
      border: result == null
          ? Border.all(color: Theme.of(context).colorScheme.outlineVariant)
          : null,
    ),
    child: Text(
      result == true
          ? 'V'
          : result == false
          ? 'D'
          : '—',
      style: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w800,
        color: result == true
            ? const Color(0xff15301a)
            : Theme.of(context).colorScheme.onSurfaceVariant,
      ),
    ),
  );
}

final class _GameGrid extends StatelessWidget {
  const _GameGrid({required this.vm});
  final ProfileLoaded vm;
  @override
  Widget build(BuildContext context) {
    final sport = vm.sportProfiles.isEmpty ? null : vm.sportProfiles.first;
    final items = [
      (AppIcons.target, 'Categoría', _category(vm) ?? 'Sin categoría'),
      (
        AppIcons.racquetSport,
        'Lado',
        _sideLabel(
          sport?.sidePreference.name ?? vm.playerProfile.sidePreference,
        ),
      ),
      (AppIcons.bolt, 'Mano', vm.playerProfile.dominantHandLabel),
      (AppIcons.pin, 'Club habitual', 'Sin club habitual'),
    ];
    final scheme = Theme.of(context).colorScheme;
    return _Card(
      padding: EdgeInsets.zero,
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: items.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 2.35,
        ),
        itemBuilder: (context, index) {
          final item = items[index];
          return Container(
            decoration: BoxDecoration(
              border: Border(
                top: index > 1
                    ? BorderSide(color: scheme.outlineVariant)
                    : BorderSide.none,
                right: index.isEven
                    ? BorderSide(color: scheme.outlineVariant)
                    : BorderSide.none,
              ),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              children: [
                Icon(item.$1, size: 17, color: scheme.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.$2,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                      Text(
                        item.$3,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
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
    );
  }
}

final class _Tournaments extends StatelessWidget {
  const _Tournaments({required this.vm});
  final ProfileLoaded vm;
  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final latest = vm.myTournaments.isEmpty ? null : vm.myTournaments.first;
    return _Card(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Expanded(
                  child: _Medal(
                    value: '${vm.myTournaments.length}',
                    label: 'Jugados',
                    color: scheme.surfaceContainerHigh,
                    iconColor: scheme.onSurface,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: const _Medal(
                    value: '—',
                    label: 'Oro',
                    color: Color(0x24d9a300),
                    iconColor: Color(0xffd9a300),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: const _Medal(
                    value: '—',
                    label: 'Plata',
                    color: Color(0x298d97a5),
                    iconColor: Color(0xff8d97a5),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: const _Medal(
                    value: '—',
                    label: 'Bronce',
                    color: Color(0x24a9702f),
                    iconColor: Color(0xffa9702f),
                  ),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: scheme.outlineVariant),
          Semantics(
            button: latest != null,
            label: 'Último torneo',
            child: InkWell(
              onTap: latest == null
                  ? null
                  : () => context.push(
                      Routes.tournamentDetail(latest.tournament.id),
                    ),
              child: Padding(
                padding: const EdgeInsets.all(13),
                child: Row(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: scheme.primary.withValues(alpha: .15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        AppIcons.trophy,
                        size: 17,
                        color: scheme.primary,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            latest?.tournament.name ??
                                (vm.tournamentsLoadFailed
                                    ? 'No pudimos cargar tus torneos'
                                    : 'Todavía no tenés torneos'),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            latest == null
                                ? 'El medallero todavía no está disponible'
                                : latest.tournament.categoryName,
                            style: TextStyle(
                              fontSize: 12,
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      AppIcons.chevronRight,
                      size: 17,
                      color: scheme.onSurfaceVariant,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

final class _Medal extends StatelessWidget {
  const _Medal({
    required this.value,
    required this.label,
    required this.color,
    required this.iconColor,
  });
  final String value;
  final String label;
  final Color color;
  final Color iconColor;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
    decoration: BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(12),
    ),
    child: Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (label != 'Jugados')
              Icon(AppIcons.trophy, size: 15, color: iconColor),
            if (label != 'Jugados') const SizedBox(width: 3),
            Text(
              value,
              style: TextStyle(
                fontSize: label == 'Jugados' ? 22 : 20,
                fontWeight: FontWeight.w800,
                color: iconColor,
              ),
            ),
          ],
        ),
        const SizedBox(height: 3),
        Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    ),
  );
}

final class _Achievements extends StatelessWidget {
  const _Achievements();
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    clipBehavior: Clip.none,
    child: Row(
      children: const [
        _Achievement(icon: AppIcons.star, label: 'Próximamente'),
        SizedBox(width: 9),
        _Achievement(icon: AppIcons.trophy, label: 'Sin datos'),
        SizedBox(width: 9),
        _Achievement(icon: AppIcons.sparkle, label: 'Logros'),
      ],
    ),
  );
}

final class _Achievement extends StatelessWidget {
  const _Achievement({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) => Opacity(
    opacity: .45,
    child: Container(
      width: 84,
      padding: const EdgeInsets.fromLTRB(6, 13, 6, 11),
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          Container(
            width: 38,
            height: 38,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Theme.of(context).colorScheme.surfaceContainerHigh,
            ),
            child: Icon(
              icon,
              size: 19,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
          ),
        ],
      ),
    ),
  );
}

final class _AvailabilityGrid extends StatelessWidget {
  const _AvailabilityGrid({required this.availability, required this.showHint});

  final List<UserAvailabilityDto> availability;
  final bool showHint;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final active = availability
        .map((slot) => '${slot.dayOfWeek.name}:${slot.slot.name}')
        .toSet();
    const days = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    const rows = [
      (AppIcons.sun, 'Mañana', AvailabilitySlot.morning),
      (AppIcons.sunset, 'Tarde', AvailabilitySlot.afternoon),
      (AppIcons.moon, 'Noche', AvailabilitySlot.evening),
    ];
    return _Card(
      child: Column(
        children: [
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 8,
            mainAxisSpacing: 8,
            crossAxisSpacing: 2,
            childAspectRatio: .95,
            children: [
              const SizedBox(),
              ...days.map(
                (day) => Center(
                  child: Text(
                    day,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ),
              for (final row in rows) ...[
                Align(
                  alignment: Alignment.centerLeft,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(row.$1, size: 14, color: scheme.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Text(
                        row.$2,
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                for (final day in DayOfWeek.values)
                  _AvailabilityCell(
                    active: active.contains('${day.name}:${row.$3.name}'),
                  ),
              ],
            ],
          ),
          if (showHint) ...[
            const SizedBox(height: 11),
            Text(
              'Se usa para sugerirte partidas. Toca Editar perfil para cambiarla.',
              style: TextStyle(fontSize: 11.5, color: scheme.onSurfaceVariant),
            ),
          ],
        ],
      ),
    );
  }
}

final class _AvailabilityCell extends StatelessWidget {
  const _AvailabilityCell({required this.active});
  final bool active;
  @override
  Widget build(BuildContext context) => Center(
    child: Container(
      width: 20,
      height: 20,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: active
            ? Theme.of(context).colorScheme.primary
            : Theme.of(context).colorScheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(7),
        border: active
            ? null
            : Border.all(color: Theme.of(context).colorScheme.outlineVariant),
      ),
      child: active
          ? const Icon(AppIcons.check, size: 12, color: Colors.white)
          : null,
    ),
  );
}

final class _Card extends StatelessWidget {
  const _Card({required this.child, this.padding = const EdgeInsets.all(14)});
  final Widget child;
  final EdgeInsetsGeometry padding;
  @override
  Widget build(BuildContext context) => Container(
    padding: padding,
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
    ),
    child: child,
  );
}

final class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Text(
    text.toUpperCase(),
    style: _labelStyle(Theme.of(context).colorScheme),
  );
}

final class _CompletionHint extends StatelessWidget {
  const _CompletionHint({required this.pendingCount});
  final int pendingCount;
  @override
  Widget build(BuildContext context) => Text(
    pendingCount == 1
        ? 'Te falta 1 paso para completar tu perfil.'
        : 'Te faltan $pendingCount pasos para completar tu perfil.',
    style: TextStyle(
      fontSize: 12.5,
      color: Theme.of(context).colorScheme.onSurfaceVariant,
    ),
  );
}

final class _DeltaPill extends StatelessWidget {
  const _DeltaPill({required this.delta});
  final double delta;
  @override
  Widget build(BuildContext context) {
    final positive = delta >= 0;
    final color = positive
        ? Theme.of(context).colorScheme.primary
        : const Color(0xffef4444);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Transform.flip(
            flipY: !positive,
            child: Icon(AppIcons.arrowForward, size: 13, color: color),
          ),
          const SizedBox(width: 3),
          Text(
            '${positive ? '+' : ''}${delta.round()}',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

final class _Sparkline extends CustomPainter {
  const _Sparkline({
    required this.values,
    required this.lineColor,
    required this.fillColor,
  });
  final List<double> values;
  final Color lineColor;
  final Color fillColor;
  @override
  void paint(Canvas canvas, Size size) {
    final min = values.reduce((a, b) => a < b ? a : b);
    final max = values.reduce((a, b) => a > b ? a : b);
    final range = (max - min).abs() < 1 ? 1 : max - min;
    final line = Path();
    for (var i = 0; i < values.length; i++) {
      final point = Offset(
        size.width * i / (values.length - 1),
        size.height - ((values[i] - min) / range * (size.height - 5)) - 2,
      );
      if (i == 0) {
        line.moveTo(point.dx, point.dy);
      } else {
        line.lineTo(point.dx, point.dy);
      }
    }
    final fill = Path.from(line)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(fill, Paint()..color = fillColor);
    canvas.drawPath(
      line,
      Paint()
        ..color = lineColor
        ..strokeWidth = 2
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(covariant _Sparkline old) =>
      old.values != values || old.lineColor != lineColor;
}

TextStyle _labelStyle(ColorScheme scheme) => TextStyle(
  fontSize: 11.5,
  fontWeight: FontWeight.w800,
  letterSpacing: .7,
  color: scheme.onSurfaceVariant,
);
String? _category(ProfileLoaded vm) =>
    vm.me.primaryRating?.categoryName ??
    vm.ratings.firstOrNull?.categoryName ??
    vm.sportProfiles.firstOrNull?.categoryLabel;
String _sideLabel(String? raw) => switch (raw?.toUpperCase()) {
  'LEFT' => 'Revés',
  'ANY' => 'Ambos lados',
  _ => 'Drive',
};
String profileInitials(String name) {
  final parts = name
      .trim()
      .split(RegExp(r'\s+'))
      .where((part) => part.isNotEmpty)
      .toList();
  if (parts.isEmpty) return '?';
  if (parts.length == 1) return parts.first.characters.first.toUpperCase();
  return '${parts.first.characters.first}${parts.last.characters.first}'
      .toUpperCase();
}

final class ProfileAvatar extends StatelessWidget {
  const ProfileAvatar({
    super.key,
    required this.initials,
    required this.avatarUrl,
    required this.size,
    required this.borderWidth,
  });
  final String initials;
  final String? avatarUrl;
  final double size;
  final double borderWidth;
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: Theme.of(context).colorScheme.primary,
      border: Border.all(color: BrandColors.limeAccent, width: borderWidth),
    ),
    child: ClipOval(
      child: avatarUrl?.trim().isNotEmpty == true
          ? Image.network(
              avatarUrl!,
              key: const ValueKey('profile-avatar-image'),
              width: size,
              height: size,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) =>
                  _InitialsAvatar(initials: initials, size: size),
            )
          : _InitialsAvatar(initials: initials, size: size),
    ),
  );
}

final class _InitialsAvatar extends StatelessWidget {
  const _InitialsAvatar({required this.initials, required this.size});

  final String initials;
  final double size;

  @override
  Widget build(BuildContext context) => Center(
    child: Text(
      initials,
      style: TextStyle(
        fontSize: size * .41,
        fontWeight: FontWeight.w800,
        color: BrandColors.onHero,
      ),
    ),
  );
}
