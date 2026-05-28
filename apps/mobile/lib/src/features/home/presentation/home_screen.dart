import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/formatting/id_preview.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/formatting/scheduled_label.dart';
import '../../../core/theme/brand_gradients.dart';
import '../../../router/routes.dart';
import '../../matches/data/models/open_match_dto.dart';
import '../../matches/presentation/open_match_display.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/skeleton_list.dart';
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
    return BlocBuilder<HomeCubit, HomeState>(
      builder: (context, state) {
        if (state is HomeLoading || state is HomeInitial) {
          return const Scaffold(body: SafeArea(child: SkeletonList(itemCount: 5)));
        }

        if (state is HomeFailure) {
          return Scaffold(
            appBar: AppBar(title: const Text('Inicio')),
            body: RefreshIndicator(
              onRefresh: () => context.read<HomeCubit>().load(),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
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
              ),
            ),
          );
        }

        final loaded = state as HomeLoaded;
        final showLiveBadge = _hasLiveMatch(loaded.myMatches);

        return Scaffold(
          body: SafeArea(
            child: RefreshIndicator(
              onRefresh: () => context.read<HomeCubit>().load(),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 18, 16, 24),
                children: [
                  _HomeHeader(greetingName: loaded.greetingName),
                  const SizedBox(height: 18),
                  _SearchHeroCard(
                    showLiveBadge: showLiveBadge,
                    onTap: () => StatefulNavigationShell.of(context).goBranch(1),
                  ),
                  const SizedBox(height: 10),
                  _VenuesHeroCard(
                    onTap: () => context.push(Routes.venues),
                  ),
                  const SizedBox(height: 12),
                  _CtaRow(
                    onBuscar: () => StatefulNavigationShell.of(context).goBranch(1),
                    onCrear: () => context.push(Routes.createMatch),
                  ),
                  const SizedBox(height: 18),
                  _MyMatchesSection(
                    myMatches: loaded.myMatches,
                    onVerTodas: () => StatefulNavigationShell.of(context).goBranch(1),
                    onMatchTap: (id) => context.push(Routes.matchDetail(id)),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Actividad cerca de ti',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                      ),
                      TextButton(
                        onPressed: () => StatefulNavigationShell.of(context).goBranch(1),
                        child: const Text('Ver todas'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (loaded.openMatches.isEmpty)
                    EmptyState(
                      title: 'Sin partidas cercanas',
                      message: 'No hay partidas abiertas por ahora. ¡Explorá nuevas!',
                      ctaLabel: 'Buscar partidas',
                      onCtaPressed: () => StatefulNavigationShell.of(context).goBranch(1),
                    )
                  else
                    ...loaded.openMatches.take(3).map(
                          (m) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _OpenMatchPreviewTile(
                              match: m,
                              onTap: () => context.push(Routes.matchDetail(m.id)),
                            ),
                          ),
                        ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  /// Returns true when [myMatches] contains at least one match whose
  /// [scheduledAt] is within the next 30 minutes and whose status is either
  /// SCHEDULED or IN_PROGRESS.
  bool _hasLiveMatch(List<OpenMatchDto> myMatches) {
    if (myMatches.isEmpty) return false;
    final now = DateTime.now();
    final threshold = now.add(const Duration(minutes: 30));
    return myMatches.any((m) {
      final scheduled = m.scheduledAt;
      if (scheduled == null) return false;
      final isUpcoming = scheduled.isAfter(now.subtract(const Duration(seconds: 1))) &&
          scheduled.isBefore(threshold);
      final status = m.status.toUpperCase();
      return isUpcoming && (status == 'SCHEDULED' || status == 'IN_PROGRESS');
    });
  }
}

// ---------------------------------------------------------------------------
// CTA row — primary "Buscar partida" + secondary "Crear partida"
// ---------------------------------------------------------------------------

final class _CtaRow extends StatelessWidget {
  const _CtaRow({required this.onBuscar, required this.onCrear});

  final VoidCallback onBuscar;
  final VoidCallback onCrear;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: FilledButton.icon(
            onPressed: onBuscar,
            icon: const Icon(Icons.search),
            label: const Text('Buscar partida'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: onCrear,
            icon: const Icon(Icons.add),
            label: const Text('Crear partida'),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// "Mis partidas" section
// ---------------------------------------------------------------------------

final class _MyMatchesSection extends StatelessWidget {
  const _MyMatchesSection({
    required this.myMatches,
    required this.onVerTodas,
    required this.onMatchTap,
  });

  final List<OpenMatchDto> myMatches;
  final VoidCallback onVerTodas;
  final void Function(String matchId) onMatchTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    if (myMatches.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: scheme.outlineVariant),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                'No tenés partidas. ¡Buscá una!',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ),
            TextButton(
              onPressed: onVerTodas,
              child: const Text('Explorar'),
            ),
          ],
        ),
      );
    }

    final visible = myMatches.take(2).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Mis partidas',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
            ),
            TextButton(
              onPressed: onVerTodas,
              child: const Text('Ver todas'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...visible.map(
          (m) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _OpenMatchPreviewTile(
              match: m,
              onTap: () => onMatchTap(m.id),
            ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

final class _HomeHeader extends StatelessWidget {
  const _HomeHeader({required this.greetingName});

  final String greetingName;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final initials = greetingName.isNotEmpty ? greetingName.substring(0, 1).toUpperCase() : '?';

    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Hola, $greetingName 👋',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 2),
              Text(
                'Actividad cerca de ti',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                      color: scheme.onSurface,
                    ),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.all(2),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: scheme.primary.withValues(alpha: 0.16),
                blurRadius: 0,
                spreadRadius: 4,
              ),
            ],
          ),
          child: CircleAvatar(
            radius: 22,
            backgroundColor: scheme.primary.withValues(alpha: 0.14),
            child: Text(
              initials,
              style: TextStyle(
                color: scheme.primary,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Search hero card — with conditional "En vivo" badge
// ---------------------------------------------------------------------------

final class _SearchHeroCard extends StatelessWidget {
  const _SearchHeroCard({required this.onTap, required this.showLiveBadge});

  final VoidCallback onTap;
  final bool showLiveBadge;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final gradients = Theme.of(context).extension<BrandGradients>()!;
    // Text on the hero card is always white — the card background is always
    // navy/navyMid regardless of system theme, so this is intentional.
    const heroCardText = Color(0xFFFFFFFF);
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: gradients.heroCard,
            boxShadow: [
              BoxShadow(
                color: gradients.heroCard.colors.first.withValues(alpha: 0.35),
                blurRadius: 22,
                offset: const Offset(0, 12),
              ),
              BoxShadow(
                color: scheme.primary.withValues(alpha: 0.18),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: LinearGradient(
                      colors: [scheme.primary, scheme.primary.withValues(alpha: 0.85)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: scheme.primary.withValues(alpha: 0.35),
                        blurRadius: 14,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Icon(Icons.bolt, color: scheme.onPrimary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Buscar Partida',
                        style: TextStyle(
                          color: heroCardText,
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Matchmaking por horario y nivel',
                        style: TextStyle(
                          color: heroCardText.withValues(alpha: 0.55),
                          fontWeight: FontWeight.w700,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                if (showLiveBadge)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(999),
                      color: scheme.tertiary.withValues(alpha: 0.12),
                      border: Border.all(color: scheme.tertiary.withValues(alpha: 0.30)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: BoxDecoration(color: scheme.tertiary, shape: BoxShape.circle),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'En vivo',
                          style: TextStyle(
                            color: scheme.tertiary,
                            fontWeight: FontWeight.w900,
                            fontSize: 10,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Venues hero card — secondary call-to-action
// ---------------------------------------------------------------------------

final class _VenuesHeroCard extends StatelessWidget {
  const _VenuesHeroCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: scheme.surfaceContainerHighest,
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    color: scheme.secondaryContainer,
                  ),
                  child: Icon(Icons.location_on_outlined, color: scheme.onSecondaryContainer),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Reservar cancha',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Elegí sede, horario y creá tu partida',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Open match preview tile (unchanged structure)
// ---------------------------------------------------------------------------

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
                        match.categoryName ?? 'Cat. ${idPreview(match.categoryId)}',
                        style: TextStyle(
                          color: scheme.primary,
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      openMatchTitleLine(match),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
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
                      '${formatMoneyLabel(match.pricePerPlayerCents, openMatchDisplayCurrency(match))} p/p',
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
