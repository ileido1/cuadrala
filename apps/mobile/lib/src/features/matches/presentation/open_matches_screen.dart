import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/formatting/fx_price_labels.dart';
import '../../../core/formatting/id_preview.dart';
import '../../../core/formatting/money_conversion.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/formatting/scheduled_label.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/match_card.dart';
import '../../../shared/widgets/segmented_control.dart';
import '../data/models/open_match_dto.dart';
import 'open_match_display.dart';
import 'cubit/open_matches_cubit.dart';
import 'cubit/open_matches_state.dart';

final class OpenMatchesScreen extends StatefulWidget {
  const OpenMatchesScreen({super.key});

  @override
  State<OpenMatchesScreen> createState() => _OpenMatchesScreenState();
}

class _OpenMatchesScreenState extends State<OpenMatchesScreen> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    context.read<OpenMatchesCubit>().load();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    final position = _scrollController.position;
    if (!position.hasPixels) return;
    final remaining = position.maxScrollExtent - position.pixels;
    if (remaining < 240) {
      context.read<OpenMatchesCubit>().loadMore();
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push(Routes.createMatch),
        backgroundColor: scheme.primary,
        foregroundColor: scheme.onPrimary,
        child: const Icon(Icons.add),
      ),
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _PartidasHeader(),
            BlocBuilder<OpenMatchesCubit, OpenMatchesState>(
              buildWhen: (prev, next) => next is OpenMatchesLoaded,
              builder: (context, state) {
                if (state is! OpenMatchesLoaded) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                  child: SegmentedControl<PartidasSegment>(
                    value: state.segment,
                    onChanged: context.read<OpenMatchesCubit>().setSegment,
                    options: const [
                      SegmentedOption(
                        value: PartidasSegment.upcoming,
                        label: 'Próximas',
                      ),
                      SegmentedOption(
                        value: PartidasSegment.history,
                        label: 'Historial',
                      ),
                    ],
                  ),
                );
              },
            ),
            Expanded(
              child: BlocBuilder<OpenMatchesCubit, OpenMatchesState>(
                builder: (context, state) {
                  if (state is OpenMatchesLoading ||
                      state is OpenMatchesInitial) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (state is OpenMatchesFailure) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(state.message, textAlign: TextAlign.center),
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: () =>
                                context.read<OpenMatchesCubit>().load(),
                            child: const Text('Reintentar'),
                          ),
                        ],
                      ),
                    );
                  }

                  final loaded = state as OpenMatchesLoaded;
                  if (loaded.visibleItems.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Text(
                          loaded.segment == PartidasSegment.upcoming
                              ? 'No tenés partidas próximas.'
                              : 'Aún no hay partidas en tu historial.',
                          style: Theme.of(context).textTheme.bodyLarge,
                          textAlign: TextAlign.center,
                        ),
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: () => context.read<OpenMatchesCubit>().load(),
                    child: ListView.separated(
                      controller: _scrollController,
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                      itemCount: loaded.visibleItems.length +
                          (loaded.isLoadingMore ? 1 : 0),
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        if (index >= loaded.visibleItems.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(child: CircularProgressIndicator()),
                          );
                        }
                        final m = loaded.visibleItems[index];
                        return _MyMatchCard(
                          match: m,
                          exchangeRates: loaded.exchangeRates,
                          onTap: () => context.push(Routes.matchDetail(m.id)),
                        );
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _PartidasHeader extends StatelessWidget {
  const _PartidasHeader();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
      child: Text(
        'Mis partidas',
        style: TextStyle(
          fontSize: 27,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.5,
          color: scheme.onSurface,
        ),
      ),
    );
  }
}

final class _MyMatchCard extends StatelessWidget {
  const _MyMatchCard({
    required this.match,
    required this.exchangeRates,
    required this.onTap,
  });

  final OpenMatchDto match;
  final List<ExchangeRateRow> exchangeRates;
  final VoidCallback onTap;

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
  return (parts.first.characters.first + parts.last.characters.first)
      .toUpperCase();
}
