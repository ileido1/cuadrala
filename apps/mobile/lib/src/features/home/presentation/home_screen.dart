import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/formatting/id_preview.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/formatting/scheduled_label.dart';
import '../../../router/routes.dart';
import '../../matches/data/models/open_match_dto.dart';
import '../../shell/presentation/cubit/shell_cubit.dart';
import 'cubit/home_cubit.dart';
import 'cubit/home_state.dart';

final class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    context.read<HomeCubit>().load();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: SafeArea(
        child: BlocBuilder<HomeCubit, HomeState>(
          builder: (context, state) {
            if (state is HomeLoading || state is HomeInitial) {
              return const Center(child: CircularProgressIndicator());
            }
            if (state is HomeFailure) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(state.message, textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: () => context.read<HomeCubit>().load(),
                        child: const Text('Reintentar'),
                      ),
                    ],
                  ),
                ),
              );
            }

            final loaded = state as HomeLoaded;

            return RefreshIndicator(
              onRefresh: () => context.read<HomeCubit>().load(),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Hola, ${loaded.greetingName} 👋',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: scheme.onSurfaceVariant,
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                      ),
                      CircleAvatar(
                        backgroundColor: scheme.primary,
                        foregroundColor: scheme.onPrimary,
                        child: Text(
                          loaded.greetingName.isNotEmpty
                              ? loaded.greetingName.substring(0, 1).toUpperCase()
                              : '?',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Tu resumen',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: scheme.onSurface,
                        ),
                  ),
                  const SizedBox(height: 14),
                  _SearchHeroCard(
                    onTap: () => context.read<ShellCubit>().selectTab(1),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: () => context.push(Routes.createMatch),
                          icon: const Icon(Icons.add),
                          label: const Text('Crear Partida'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton.icon(
                          style: FilledButton.styleFrom(
                            backgroundColor: scheme.secondary,
                            foregroundColor: scheme.onSecondary,
                          ),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Próximamente: nuevo torneo.'),
                              ),
                            );
                          },
                          icon: const Icon(Icons.emoji_events),
                          label: const Text('Nuevo Torneo'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  _SectionTitle(
                    title: 'Próxima partida',
                    trailing: loaded.nextMatch?.scheduledAt == null
                        ? null
                        : _SoonBadge(target: loaded.nextMatch!.scheduledAt!),
                  ),
                  const SizedBox(height: 10),
                  _NextMatchCard(match: loaded.nextMatch),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Abiertas cerca de ti',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.read<ShellCubit>().selectTab(1),
                        child: const Text('Ver todas'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ...loaded.openMatches.take(3).map(
                        (m) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _OpenMatchPreviewTile(
                            match: m,
                            onTap: () => context.push(Routes.matchDetail(m.id)),
                          ),
                        ),
                      ),
                  if (loaded.openMatches.isEmpty)
                    Text(
                      'No hay partidas abiertas por ahora.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                    ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

final class _SoonBadge extends StatelessWidget {
  const _SoonBadge({required this.target});

  final DateTime target;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final now = DateTime.now();
    final diff = target.difference(now);
    final minutes = diff.inMinutes;
    String label;
    if (minutes <= 0) {
      label = 'Pronto';
    } else if (minutes < 60) {
      label = 'En ${minutes}m';
    } else {
      final hours = (minutes / 60).floor();
      label = 'En ${hours}h';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: scheme.primary.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: scheme.primary.withValues(alpha: 0.35)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: scheme.primary,
          fontWeight: FontWeight.w800,
          fontSize: 12,
        ),
      ),
    );
  }
}

final class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, this.trailing});

  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
        ),
        if (trailing != null) trailing!,
      ],
    );
  }
}

final class _SearchHeroCard extends StatelessWidget {
  const _SearchHeroCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.secondary,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: scheme.primary,
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.bolt, color: scheme.onPrimary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Buscar Partida',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: scheme.onSecondary,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Matchmaking por horario y nivel',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.onSecondary.withValues(alpha: 0.85),
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: scheme.primary, width: 2),
                ),
                child: Row(
                  children: [
                    Icon(Icons.circle, size: 8, color: scheme.primary),
                    const SizedBox(width: 6),
                    Text(
                      'EN VIVO',
                      style: TextStyle(
                        color: scheme.onSecondary,
                        fontWeight: FontWeight.w900,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final class _NextMatchCard extends StatelessWidget {
  const _NextMatchCard({required this.match});

  final OpenMatchDto? match;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (match == null) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: scheme.outlineVariant),
        ),
        child: Text(
          'Aún no tienes una próxima partida.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
        ),
      );
    }

    final m = match!;
    final scheduled = m.scheduledAt;
    final timeText = scheduled == null
        ? 'Horario por confirmar'
        : '${shortDateLabel(scheduled)}, ${formatTimeHm(scheduled)} hs';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            scheme.primary,
            scheme.primary.withValues(alpha: 0.85),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: scheme.primary.withValues(alpha: 0.25),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Partida abierta',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: scheme.onPrimary,
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            'Categoría: ${idPreview(m.categoryId)}',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: scheme.onPrimary.withValues(alpha: 0.92),
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(Icons.location_on, color: scheme.onPrimary, size: 18),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  m.clubName != null || m.courtName != null
                      ? [
                          if (m.clubName != null) m.clubName!,
                          if (m.courtName != null) m.courtName!,
                        ].join(' • ')
                      : 'Cancha: ${idPreview(m.id)}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: scheme.onPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
            ],
          ),
          if (m.locationLabel != null) ...[
            const SizedBox(height: 6),
            Text(
              m.locationLabel!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onPrimary.withValues(alpha: 0.92),
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ],
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                Icon(Icons.calendar_month, color: scheme.onPrimary, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    timeText,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: scheme.onPrimary,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ),
                Text(
                  '${m.participantCount}/${m.maxParticipants}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: scheme.onPrimary,
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: scheme.onPrimary,
                foregroundColor: scheme.primary,
              ),
              onPressed: () => context.push(Routes.matchDetail(m.id)),
              child: const Text('Ver detalle'),
            ),
          ),
        ],
      ),
    );
  }
}

final class _OpenMatchPreviewTile extends StatelessWidget {
  const _OpenMatchPreviewTile({required this.match, required this.onTap});

  final OpenMatchDto match;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final scheduled = match.scheduledAt;
    final day = scheduled == null ? '—' : shortDateLabel(scheduled);
    final time = scheduled == null ? '—' : formatTimeHm(scheduled);

    return Material(
      color: scheme.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Row(
            children: [
              Container(
                width: 64,
                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Text(
                      day,
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      time,
                      style: TextStyle(
                        color: scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: scheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        'Cat. ${idPreview(match.categoryId)}',
                        style: TextStyle(
                          color: scheme.primary,
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    if (match.clubName != null || match.courtName != null)
                      Text(
                        [
                          if (match.clubName != null) match.clubName!,
                          if (match.courtName != null) match.courtName!,
                        ].join(' • '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      )
                    else
                    Text(
                      'Partida ${idPreview(match.id)}',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                    if (match.locationLabel != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        match.locationLabel!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ],
                    const SizedBox(height: 4),
                    Text(
                      '\$ ${formatMoneyCents(match.pricePerPlayerCents)} p/p',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.primary,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ],
                ),
              ),
              Column(
                children: [
                  Text(
                    '${match.participantCount}/${match.maxParticipants}',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
