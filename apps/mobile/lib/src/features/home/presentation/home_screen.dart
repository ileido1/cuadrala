import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/formatting/fx_price_labels.dart';
import '../../../core/formatting/id_preview.dart';
import '../../../core/formatting/money_conversion.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/formatting/scheduled_label.dart';
import '../../../core/theme/app_icons.dart';
import '../../../router/routes.dart';
import '../../matches/data/models/open_match_dto.dart';
import '../../venues/presentation/create_match_panel.dart';
import '../../matches/presentation/open_match_display.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/match_card.dart';
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
                child: ErrorState(
                  message: state.message,
                  onRetry: () => context.read<HomeCubit>().load(),
                ),
              ),
            ),
          );
        }

        final loaded = state as HomeLoaded;

        return Scaffold(
          body: SafeArea(
            child: RefreshIndicator(
              onRefresh: () => context.read<HomeCubit>().load(),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
                children: [
                  _HomeHeader(
                    greetingName: loaded.greetingName,
                    levelCategory: loaded.levelCategory,
                    levelElo: loaded.levelElo,
                    onBellTap: () => context.go(Routes.avisos),
                  ),
                  const SizedBox(height: 16),
                  _HeroCard(
                    onBuscar: () => context.push(Routes.discoverMatches),
                    onCrear: () => showCreateMatchSheet(context),
                  ),
                  const SizedBox(height: 20),
                  _MyMatchesSection(
                    myMatches: loaded.myMatches,
                    exchangeRates: loaded.exchangeRates,
                    onVerTodas: () => StatefulNavigationShell.of(context).goBranch(1),
                    onMatchTap: (id) => context.push(Routes.matchDetail(id)),
                  ),
                  const SizedBox(height: 20),
                  _SectionHeader(
                    title: 'Cerca de ti',
                    onAction: () => context.push(Routes.discoverMatches),
                  ),
                  const SizedBox(height: 10),
                  if (loaded.openMatches.isEmpty)
                    EmptyState(
                      title: 'Sin partidas cercanas',
                      message: 'No hay partidas abiertas por ahora. ¡Explorá nuevas!',
                      ctaLabel: 'Buscar partidas',
                      onCtaPressed: () => context.push(Routes.discoverMatches),
                    )
                  else
                    ...loaded.openMatches.take(3).map(
                          (m) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _MatchCardFor(
                              match: m,
                              exchangeRates: loaded.exchangeRates,
                              live: false,
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
}

/// True cuando la partida arranca dentro de los próximos 30 min y está
/// programada o en curso.
bool _isLiveMatch(OpenMatchDto m) {
  final scheduled = m.scheduledAt;
  if (scheduled == null) return false;
  final now = DateTime.now();
  final threshold = now.add(const Duration(minutes: 30));
  final isUpcoming = scheduled.isAfter(now.subtract(const Duration(seconds: 1))) &&
      scheduled.isBefore(threshold);
  final status = m.status.toUpperCase();
  return isUpcoming && (status == 'SCHEDULED' || status == 'IN_PROGRESS');
}

// ---------------------------------------------------------------------------
// MatchCard adapter — maps an OpenMatchDto to the shared presentational card
// ---------------------------------------------------------------------------

final class _MatchCardFor extends StatelessWidget {
  const _MatchCardFor({
    required this.match,
    required this.onTap,
    required this.exchangeRates,
    this.live = false,
  });

  final OpenMatchDto match;
  final VoidCallback onTap;
  final List<ExchangeRateRow> exchangeRates;
  final bool live;

  @override
  Widget build(BuildContext context) {
    final scheduled = match.scheduledAt;
    final currency = openMatchDisplayCurrency(match);
    final dateIso = scheduled != null
        ? localCalendarDateIsoSV(scheduled)
        : localCalendarDateIsoSV(DateTime.now());

    return MatchCard(
      dowLabel: scheduled == null ? '—' : shortDateLabel(scheduled),
      timeLabel: scheduled == null ? '—' : formatTimeHm(scheduled),
      subDateLabel: scheduled == null ? '—' : compactCalendarDate(scheduled),
      title: openMatchTitleLine(match),
      category: match.categoryName ?? 'Cat. ${idPreview(match.categoryId)}',
      locationLabel: match.locationLabel,
      participantInitials: match.participantPreview
          .map((p) => _initialsFrom(p.displayName))
          .where((s) => s.isNotEmpty)
          .toList(),
      participantCount: match.participantCount,
      maxParticipants: match.maxParticipants,
      primaryPriceLabel: formatMoneyLabel(
        match.pricePerPlayerCents,
        currency,
      ),
      secondaryPriceLabel: secondaryBsLabelSV(
        primaryMinor: match.pricePerPlayerCents,
        primaryCurrency: currency,
        rates: exchangeRates,
        effectiveDateIso: dateIso,
      ),
      live: live || _isLiveMatch(match),
      onTap: onTap,
    );
  }
}

String _initialsFrom(String name) {
  final raw = name.trim();
  if (raw.isEmpty) return '';
  final parts = raw.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return '';
  if (parts.length == 1) return parts.first.characters.first.toUpperCase();
  return (parts.first.characters.first + parts.last.characters.first).toUpperCase();
}

// ---------------------------------------------------------------------------
// Hero card — bolt + CTAs Buscar / Crear dentro de la card
// ---------------------------------------------------------------------------

final class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.onBuscar, required this.onCrear});

  final VoidCallback onBuscar;
  final VoidCallback onCrear;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // Glow radial verde en la esquina superior derecha.
          Positioned(
            right: -40,
            top: -60,
            child: Container(
              width: 200,
              height: 160,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    scheme.primary.withValues(alpha: 0.22),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(13),
                        color: scheme.primary,
                        boxShadow: [
                          BoxShadow(
                            color: scheme.primary.withValues(alpha: 0.45),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Icon(AppIcons.bolt,
                          color: scheme.onPrimary, size: 24),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Buscar partida',
                            style: TextStyle(
                              color: scheme.onSurface,
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Matchmaking por horario y nivel',
                            style: TextStyle(
                              color: scheme.onSurfaceVariant,
                              fontWeight: FontWeight.w500,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: SizedBox(
                        height: 48,
                        child: FilledButton.icon(
                          onPressed: onBuscar,
                          style: FilledButton.styleFrom(
                            elevation: 6,
                            shadowColor: scheme.primary.withValues(alpha: 0.4),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          icon: const Icon(AppIcons.search, size: 18),
                          label: const Text(
                            'Buscar',
                            style: TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: SizedBox(
                        height: 48,
                        child: OutlinedButton.icon(
                          onPressed: onCrear,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: scheme.onSurface,
                            backgroundColor: scheme.surfaceContainerHighest,
                            side: BorderSide(
                              color: scheme.outlineVariant,
                              width: 1.5,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          icon: const Icon(AppIcons.add, size: 18),
                          label: const Text(
                            'Crear',
                            style: TextStyle(fontWeight: FontWeight.w800),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Section header row — title + "Ver todas" action
// ---------------------------------------------------------------------------

final class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.onAction});

  final String title;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  fontSize: 19,
                ),
          ),
        ),
        TextButton(
          onPressed: onAction,
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Text(
            'Ver todas',
            style: TextStyle(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.w700,
              fontSize: 13.5,
            ),
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
    required this.exchangeRates,
    required this.onVerTodas,
    required this.onMatchTap,
  });

  final List<OpenMatchDto> myMatches;
  final List<ExchangeRateRow> exchangeRates;
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
        _SectionHeader(title: 'Mis partidas', onAction: onVerTodas),
        const SizedBox(height: 8),
        ...visible.map(
          (m) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _MatchCardFor(
              match: m,
              exchangeRates: exchangeRates,
              onTap: () => onMatchTap(m.id),
            ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Header — avatar (lime ring) + greeting + H1 + bell button
// ---------------------------------------------------------------------------

final class _HomeHeader extends StatelessWidget {
  const _HomeHeader({
    required this.greetingName,
    required this.onBellTap,
    this.levelCategory,
    this.levelElo,
  });

  final String greetingName;
  final VoidCallback onBellTap;
  final String? levelCategory;
  final int? levelElo;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final initials = greetingName.isNotEmpty
        ? greetingName.trim().substring(0, 1).toUpperCase()
        : '?';
    final hasLevel = levelCategory != null || levelElo != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: scheme.primary,
                border: Border.all(color: scheme.tertiary, width: 2),
              ),
              alignment: Alignment.center,
              child: Text(
                initials,
                style: TextStyle(
                  color: scheme.onPrimary,
                  fontWeight: FontWeight.w800,
                  fontSize: 19,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Hola, $greetingName',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                  if (hasLevel) ...[
                    const SizedBox(height: 4),
                    _LevelRow(category: levelCategory, elo: levelElo),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            _BellButton(onTap: onBellTap),
          ],
        ),
        const SizedBox(height: 14),
        Text(
          'Actividad cerca de ti',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
                fontSize: 27,
                letterSpacing: -0.5,
                color: scheme.onSurface,
              ),
        ),
      ],
    );
  }
}

/// Fila de nivel: categoría + ELO inline (handoff).
final class _LevelRow extends StatelessWidget {
  const _LevelRow({this.category, this.elo});

  final String? category;
  final int? elo;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(AppIcons.target, size: 13, color: scheme.primary),
        const SizedBox(width: 5),
        if (category != null)
          Text(
            category!,
            style: TextStyle(
              color: scheme.onSurface,
              fontWeight: FontWeight.w800,
              fontSize: 13.5,
            ),
          ),
        if (category != null && elo != null) ...[
          const SizedBox(width: 5),
          Text(
            '·',
            style: TextStyle(color: scheme.onSurfaceVariant),
          ),
          const SizedBox(width: 5),
        ],
        if (elo != null) ...[
          Text(
            '$elo',
            style: TextStyle(
              color: scheme.onSurface,
              fontWeight: FontWeight.w700,
              fontSize: 13.5,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            'ELO',
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ],
      ],
    );
  }
}

final class _BellButton extends StatelessWidget {
  const _BellButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surfaceContainer,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: scheme.outlineVariant, width: 1.5),
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Icon(
                AppIcons.bell,
                color: scheme.onSurface,
                size: 20,
              ),
              Positioned(
                top: 10,
                right: 11,
                child: Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: scheme.tertiary,
                    shape: BoxShape.circle,
                    border: Border.all(color: scheme.surfaceContainer, width: 1.5),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
