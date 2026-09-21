import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/theme/app_icons.dart';
import '../../../shared/widgets/error_state.dart';
import '../../onboarding/data/models/user_availability_dto.dart';
import 'cubit/profile_cubit.dart';
import 'cubit/profile_state.dart';
import 'profile_screen.dart' show ProfileAvatar, profileInitials;

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
        final category =
            vm.me.primaryRating?.categoryName ??
            vm.ratings.firstOrNull?.categoryName ??
            vm.sportProfiles.firstOrNull?.categoryLabel;
        final side =
            switch ((vm.sportProfiles.firstOrNull?.sidePreference.name ??
                    vm.playerProfile.sidePreference)
                ?.toUpperCase()) {
              'LEFT' => 'Revés',
              'ANY' => 'Ambos lados',
              _ => 'Drive',
            };
        final rating =
            vm.me.primaryRating?.rating ?? vm.ratings.firstOrNull?.rating;
        return Column(
          children: [
            SafeArea(
              bottom: false,
              child: Container(
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
                      label: 'Cerrar vista pública',
                      child: Material(
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(11),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(11),
                          onTap: () => Navigator.of(context).pop(),
                          child: const SizedBox(
                            width: 36,
                            height: 36,
                            child: Icon(AppIcons.close, size: 18),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Vista pública',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            'Así te ven los demás jugadores',
                            style: TextStyle(
                              fontSize: 12,
                              color: Theme.of(
                                context,
                              ).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
                child: Column(
                  children: [
                    ProfileAvatar(
                      initials: profileInitials(vm.me.name),
                      avatarUrl: vm.playerProfile.avatarUrl,
                      size: 76,
                      borderWidth: 3,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      vm.me.name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (vm.location?.label?.isNotEmpty == true) ...[
                      const SizedBox(height: 1),
                      Text(
                        vm.location!.label!,
                        style: TextStyle(
                          fontSize: 12.5,
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      alignment: WrapAlignment.center,
                      children: [
                        if (category != null) _Chip(category),
                        _Chip(side),
                        _Chip(vm.playerProfile.dominantHandLabel),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: _Stat(
                            value: rating?.toStringAsFixed(0) ?? '—',
                            label: 'ELO',
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _Stat(
                            value: '${vm.stats.matchesPlayed}',
                            label: 'Jugadas',
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _Stat(
                            value: '${(vm.stats.winRate * 100).round()}%',
                            label: 'Victorias',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    const _Label('Forma reciente'),
                    const SizedBox(height: 8),
                    _Surface(
                      child: Row(
                        children: [
                          for (var i = 0; i < 5; i++)
                            Padding(
                              padding: EdgeInsets.only(right: i == 4 ? 0 : 5),
                              child: const _FormPill(),
                            ),
                          const Spacer(),
                          Text(
                            'Sin datos',
                            style: TextStyle(
                              fontSize: 12.5,
                              color: Theme.of(
                                context,
                              ).colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    const _Label('Cuándo juega'),
                    const SizedBox(height: 8),
                    _Availability(availability: vm.availability),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: null,
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(50),
                        ),
                        child: const Text('Invitar a jugar'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    ),
  );
}

final class _Chip extends StatelessWidget {
  const _Chip(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.primary.withValues(alpha: .14),
      borderRadius: BorderRadius.circular(999),
    ),
    child: Text(
      text,
      style: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: Theme.of(context).colorScheme.primary,
      ),
    ),
  );
}

final class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) => _Surface(
    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
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
  );
}

final class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.centerLeft,
    child: Text(
      text.toUpperCase(),
      style: TextStyle(
        fontSize: 11.5,
        fontWeight: FontWeight.w800,
        letterSpacing: .7,
        color: Theme.of(context).colorScheme.onSurfaceVariant,
      ),
    ),
  );
}

final class _Surface extends StatelessWidget {
  const _Surface({
    required this.child,
    this.padding = const EdgeInsets.all(14),
  });
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

final class _FormPill extends StatelessWidget {
  const _FormPill();
  @override
  Widget build(BuildContext context) => Container(
    width: 26,
    height: 26,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.surfaceContainerHigh,
      borderRadius: BorderRadius.circular(9),
      border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
    ),
    child: Text(
      '—',
      style: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w800,
        color: Theme.of(context).colorScheme.onSurfaceVariant,
      ),
    ),
  );
}

final class _Availability extends StatelessWidget {
  const _Availability({required this.availability});
  final List<UserAvailabilityDto> availability;
  @override
  Widget build(BuildContext context) {
    final active = availability
        .map((slot) => '${slot.dayOfWeek.name}:${slot.slot.name}')
        .toSet();
    const days = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    const rows = [
      (AppIcons.sun, 'Mañana', AvailabilitySlot.morning),
      (AppIcons.sunset, 'Tarde', AvailabilitySlot.afternoon),
      (AppIcons.moon, 'Noche', AvailabilitySlot.evening),
    ];
    return _Surface(
      child: GridView.count(
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
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          ),
          for (final row in rows) ...[
            Align(
              alignment: Alignment.centerLeft,
              child: Icon(
                row.$1,
                size: 14,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            for (final day in DayOfWeek.values)
              Center(
                child: Container(
                  width: 20,
                  height: 20,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: active.contains('${day.name}:${row.$3.name}')
                        ? Theme.of(context).colorScheme.primary
                        : Theme.of(context).colorScheme.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(7),
                    border: active.contains('${day.name}:${row.$3.name}')
                        ? null
                        : Border.all(
                            color: Theme.of(context).colorScheme.outlineVariant,
                          ),
                  ),
                  child: active.contains('${day.name}:${row.$3.name}')
                      ? const Icon(
                          AppIcons.check,
                          size: 12,
                          color: Colors.white,
                        )
                      : null,
                ),
              ),
          ],
        ],
      ),
    );
  }
}
