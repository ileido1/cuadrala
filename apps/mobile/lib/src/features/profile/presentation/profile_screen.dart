import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../auth/presentation/cubit/session_cubit.dart';
import '../../../core/di/service_locator.dart';
import '../../../core/formatting/id_preview.dart';
import '../../../core/formatting/scheduled_label.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/danger_button.dart';
import '../../onboarding/data/models/onboarding_status_dto.dart';
import '../../onboarding/data/models/player_sport_profile_dto.dart';
import '../../onboarding/data/models/user_availability_dto.dart';
import '../../onboarding/data/models/user_location_dto.dart';
import '../../onboarding/data/onboarding_repository.dart';
import '../data/models/user_me_dto.dart';
import '../data/models/user_rating_dto.dart';
import '../data/models/user_stats_dto.dart';
import '../data/profile_repository.dart';

final class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late Future<_ProfileVm> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_ProfileVm> _load() async {
    final repo = getIt<ProfileRepository>();
    final onboarding = getIt<OnboardingRepository>();
    final me = await repo.getMe();
    final results = await Future.wait([
      repo.getUserStats(me.id),
      repo.getUserRatings(userId: me.id),
      repo.getUserRatingHistory(userId: me.id, limit: 10),
      onboarding.getStatus(),
      onboarding.listSportProfiles(),
      onboarding.getLocation(),
      onboarding.listAvailability(),
    ]);
    return _ProfileVm(
      me: me,
      stats: results[0] as UserStatsDto,
      ratings: results[1] as List<UserRatingDto>,
      history: results[2] as List<UserRatingHistoryItemDto>,
      onboardingStatus: results[3] as OnboardingStatusDto,
      sportProfiles: results[4] as List<PlayerSportProfileDto>,
      location: results[5] as UserLocationDto?,
      availability: results[6] as List<UserAvailabilityDto>,
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('No se pudo cargar el perfil.'),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () => setState(() => _future = _load()),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            ),
          );
        }

        final vm = snapshot.data!;
        final scheme = Theme.of(context).colorScheme;

        return RefreshIndicator(
          onRefresh: () async => setState(() => _future = _load()),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                vm.me.name,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                '${vm.me.email} · ${vm.me.subscriptionType}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 16),
              if (!vm.onboardingStatus.isComplete)
                _OnboardingBanner(
                  pendingCount: vm.onboardingStatus.pendingSteps.length,
                ),
              if (!vm.onboardingStatus.isComplete) const SizedBox(height: 16),
              _SectionTitle(title: 'Mi perfil'),
              const SizedBox(height: 10),
              _MyProfileCard(
                sportProfiles: vm.sportProfiles,
                location: vm.location,
                availability: vm.availability,
              ),
              const SizedBox(height: 16),
              _SectionTitle(title: 'Estadísticas'),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      label: 'Jugados',
                      value: vm.stats.matchesPlayed.toString(),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatCard(
                      label: 'Ganados',
                      value: vm.stats.matchesWon.toString(),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatCard(
                      label: 'Win%',
                      value: '${(vm.stats.winRate * 100).toStringAsFixed(0)}%',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _SectionTitle(title: 'Ratings (ELO)'),
              const SizedBox(height: 10),
              if (vm.ratings.isEmpty)
                Text(
                  'Aún no tienes rating.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                )
              else
                ...vm.ratings.map(
                  (r) => Card(
                    child: ListTile(
                      title: Text('Categoría ${idPreview(r.categoryId)}'),
                      trailing: Text(
                        r.rating.toStringAsFixed(0),
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                      subtitle: Text(
                        'Actualizado: ${shortDateLabel(r.updatedAt.toLocal())} · ${formatTimeHm(r.updatedAt.toLocal())}',
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 16),
              _SectionTitle(title: 'Historial reciente'),
              const SizedBox(height: 10),
              if (vm.history.isEmpty)
                Text(
                  'Sin historial todavía.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                )
              else
                ...vm.history.map(
                  (h) => Card(
                    child: ListTile(
                      title: Text('Partida ${idPreview(h.matchId)}'),
                      subtitle: Text(
                        '${h.previousRating.toStringAsFixed(0)} → ${h.newRating.toStringAsFixed(0)} (K ${h.kFactor.toStringAsFixed(0)})',
                      ),
                      trailing: Text(
                        '${shortDateLabel(h.createdAt.toLocal())} · ${formatTimeHm(h.createdAt.toLocal())}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                            ),
                      ),
                    ),
                  ),
                ),
              const SizedBox(height: 18),
              DangerButton(
                label: 'Cerrar sesión',
                onPressed: () async {
                  await context.read<SessionCubit>().logout();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Sesión cerrada.')),
                    );
                  }
                },
              ),
            ],
          ),
        );
      },
    );
  }
}

final class _ProfileVm {
  const _ProfileVm({
    required this.me,
    required this.stats,
    required this.ratings,
    required this.history,
    required this.onboardingStatus,
    required this.sportProfiles,
    required this.location,
    required this.availability,
  });

  final UserMeDto me;
  final UserStatsDto stats;
  final List<UserRatingDto> ratings;
  final List<UserRatingHistoryItemDto> history;
  final OnboardingStatusDto onboardingStatus;
  final List<PlayerSportProfileDto> sportProfiles;
  final UserLocationDto? location;
  final List<UserAvailabilityDto> availability;
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

final class _MyProfileCard extends StatelessWidget {
  const _MyProfileCard({
    required this.sportProfiles,
    required this.location,
    required this.availability,
  });

  final List<PlayerSportProfileDto> sportProfiles;
  final UserLocationDto? location;
  final List<UserAvailabilityDto> availability;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: scheme.surface,
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _row(
            context,
            icon: Icons.sports_tennis,
            title: 'Deportes',
            value: sportProfiles.isEmpty
                ? 'Sin deportes configurados'
                : sportProfiles
                    .map((p) => '${idPreview(p.sportId)} · ${p.skillLevel.toStringAsFixed(1)}')
                    .join('  ·  '),
          ),
          const Divider(height: 18),
          _row(
            context,
            icon: Icons.place_outlined,
            title: 'Ubicación',
            value: location == null
                ? 'Sin ubicación'
                : '${location!.label ?? "${location!.latitude.toStringAsFixed(3)}, ${location!.longitude.toStringAsFixed(3)}"} · radio ${location!.radiusKm} km',
          ),
          const Divider(height: 18),
          _row(
            context,
            icon: Icons.calendar_month,
            title: 'Disponibilidad',
            value: availability.isEmpty
                ? 'Sin franjas configuradas'
                : '${availability.length} franja(s) disponibles por semana',
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: () => context.push(Routes.onboarding),
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: const Text('Editar'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(BuildContext context, {required IconData icon, required String title, required String value}) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: scheme.onSurfaceVariant),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 2),
              Text(value, style: TextStyle(color: scheme.onSurfaceVariant)),
            ],
          ),
        ),
      ],
    );
  }
}

final class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: scheme.surfaceContainerHighest,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: scheme.onSurfaceVariant,
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
        ],
      ),
    );
  }
}

