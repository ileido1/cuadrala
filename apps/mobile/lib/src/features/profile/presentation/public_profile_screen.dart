import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/brand_colors.dart';
import '../../../shared/widgets/error_state.dart';
import '../../onboarding/data/models/user_availability_dto.dart';
import 'cubit/profile_cubit.dart';
import 'cubit/profile_state.dart';

final class PublicProfileScreen extends StatefulWidget {
  const PublicProfileScreen({super.key});

  @override
  State<PublicProfileScreen> createState() => _PublicProfileScreenState();
}

final class _PublicProfileScreenState extends State<PublicProfileScreen> {
  late final ProfileCubit _cubit = getIt<ProfileCubit>()..load();

  @override
  void dispose() {
    _cubit.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Vista pública'),
      leading: IconButton(
        tooltip: 'Cerrar',
        onPressed: () => Navigator.of(context).pop(),
        icon: const Icon(AppIcons.close),
      ),
    ),
    body: BlocBuilder<ProfileCubit, ProfileState>(
      bloc: _cubit,
      builder: (context, state) {
        if (state is ProfileInitial || state is ProfileLoading) {
          return const Center(child: CircularProgressIndicator());
        }
        if (state is ProfileFailure) {
          return ErrorState(message: state.message, onRetry: _cubit.load);
        }
        final vm = state as ProfileLoaded;
        final rating =
            vm.me.primaryRating?.rating ??
            (vm.ratings.isEmpty ? null : vm.ratings.first.rating);
        final category =
            vm.me.primaryRating?.categoryName ??
            (vm.sportProfiles.isEmpty
                ? null
                : vm.sportProfiles.first.categoryLabel);
        return SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 32),
          child: Column(
            children: [
              _PublicAvatar(initials: _profileInitials(vm.me.name)),
              const SizedBox(height: 12),
              Text(
                vm.me.name,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                children: [
                  _PublicPill(category ?? 'Sin categoría'),
                  _PublicPill(_sideLabel(vm.playerProfile.sidePreference)),
                  _PublicPill(vm.playerProfile.dominantHandLabel),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: _PublicStat(
                      value: rating?.toStringAsFixed(0) ?? '—',
                      label: 'ELO',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _PublicStat(
                      value: '${vm.stats.matchesPlayed}',
                      label: 'Jugadas',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _PublicStat(
                      value: '${(vm.stats.winRate * 100).round()}%',
                      label: 'Victorias',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _PublicSection(
                title: 'Forma reciente',
                child: _UnsupportedPublicSection(
                  message:
                      'Los resultados ganados y perdidos aún no están disponibles.',
                ),
              ),
              const SizedBox(height: 18),
              _PublicSection(
                title: 'Cuándo juega',
                child: _AvailabilityGrid(vm: vm),
              ),
              const SizedBox(height: 18),
              _UnsupportedPublicSection(
                icon: AppIcons.personAdd,
                message:
                    'Invitar a jugar requiere un endpoint de contacto entre jugadores.',
              ),
            ],
          ),
        );
      },
    ),
  );
}

final class _PublicAvatar extends StatelessWidget {
  const _PublicAvatar({required this.initials});
  final String initials;

  @override
  Widget build(BuildContext context) => Container(
    width: 72,
    height: 72,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: BrandColors.padelGreen,
      border: Border.all(color: BrandColors.limeAccent, width: 3),
    ),
    child: Text(
      initials,
      style: const TextStyle(
        fontSize: 30,
        fontWeight: FontWeight.w900,
        color: Colors.white,
      ),
    ),
  );
}

final class _PublicPill extends StatelessWidget {
  const _PublicPill(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.primary.withValues(alpha: .14),
      borderRadius: BorderRadius.circular(999),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
      child: Text(
        text,
        style: TextStyle(
          color: Theme.of(context).colorScheme.primary,
          fontWeight: FontWeight.w800,
          fontSize: 12,
        ),
      ),
    ),
  );
}

final class _PublicStat extends StatelessWidget {
  const _PublicStat({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 14),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
    ),
    child: Column(
      children: [
        Text(
          value,
          style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 3),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    ),
  );
}

final class _PublicSection extends StatelessWidget {
  const _PublicSection({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
      const SizedBox(height: 8),
      child,
    ],
  );
}

final class _UnsupportedPublicSection extends StatelessWidget {
  const _UnsupportedPublicSection({required this.message, this.icon});

  final String message;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
    ),
    child: Row(
      children: [
        if (icon != null) ...[
          Icon(icon, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(width: 10),
        ],
        Expanded(
          child: Text(
            message,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      ],
    ),
  );
}

final class _AvailabilityGrid extends StatelessWidget {
  const _AvailabilityGrid({required this.vm});
  final ProfileLoaded vm;
  @override
  Widget build(BuildContext context) {
    final active = vm.availability
        .map((slot) => '${slot.dayOfWeek.name}:${slot.slot.name}')
        .toSet();
    const days = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
    const slots = ['morning', 'afternoon', 'evening'];
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const SizedBox(width: 70),
              for (final day in days)
                Expanded(
                  child: Center(
                    child: Text(
                      day,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          for (final slot in slots)
            Row(
              children: [
                SizedBox(
                  width: 70,
                  child: Text(
                    slot == 'morning'
                        ? '☼ Mañana'
                        : slot == 'afternoon'
                        ? '☷ Tarde'
                        : '☾ Noche',
                    style: TextStyle(
                      fontSize: 11,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
                for (var i = 0; i < 7; i++)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(3),
                      child: _AvailabilityCell(
                        active: active.contains(
                          '${DayOfWeek.values[i].name}:$slot',
                        ),
                      ),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

final class _AvailabilityCell extends StatelessWidget {
  const _AvailabilityCell({required this.active});
  final bool active;
  @override
  Widget build(BuildContext context) => Container(
    height: 20,
    decoration: BoxDecoration(
      color: active
          ? BrandColors.padelGreen
          : Theme.of(context).colorScheme.surfaceContainerHigh,
      borderRadius: BorderRadius.circular(5),
    ),
    child: active
        ? const Icon(AppIcons.check, size: 14, color: Colors.white)
        : null,
  );
}

String _sideLabel(String? raw) => switch (raw?.toUpperCase()) {
  'LEFT' => 'Revés',
  'ANY' => 'Ambos lados',
  _ => 'Drive',
};

String _profileInitials(String name) {
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
