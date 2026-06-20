import 'package:flutter/material.dart';

import '../../../../core/theme/app_icons.dart';
import '../../../../core/theme/brand_colors.dart';
import '../../data/models/user_rating_dto.dart';
import '../cubit/profile_state.dart';
import '../profile_screen.dart';

void showProfileEloSheet(BuildContext context, ProfileLoaded vm) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (ctx) => _ProfileEloSheet(vm: vm),
  );
}

final class _ProfileEloSheet extends StatelessWidget {
  const _ProfileEloSheet({required this.vm});

  final ProfileLoaded vm;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final maxHeight = MediaQuery.sizeOf(context).height * 0.85;

    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: maxHeight),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Historial de ELO',
                    style: TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                      color: scheme.onSurface,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(AppIcons.close),
                ),
              ],
            ),
          ),
          Flexible(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              shrinkWrap: true,
              children: [
                if (vm.history.isNotEmpty) ...[
                  Text(
                    'Cambios recientes',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: scheme.onSurfaceVariant,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 8),
                  for (final item in vm.history.take(10))
                    _HistoryRow(item: item),
                  const SizedBox(height: 20),
                ],
                Text(
                  'Top 5 • ${vm.ratings.isNotEmpty ? 'Tu categoría' : 'Clasificación'}',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                    color: scheme.onSurface,
                  ),
                ),
                const SizedBox(height: 10),
                if (vm.leaderboard.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Text(
                        'Sin datos de clasificación',
                        style: TextStyle(color: scheme.onSurfaceVariant),
                      ),
                    ),
                  )
                else
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      color: scheme.surface,
                      border: Border.all(
                        color: scheme.outlineVariant,
                        width: 1.5,
                      ),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      children: [
                        for (var i = 0; i < vm.leaderboard.length; i++) ...[
                          if (i > 0)
                            Divider(
                              height: 1,
                              color: scheme.outlineVariant.withValues(
                                alpha: 0.6,
                              ),
                            ),
                          _LeaderboardRow(
                            rank: vm.leaderboard[i].rank,
                            name: vm.leaderboard[i].displayName,
                            rating: vm.leaderboard[i].rating.round(),
                            highlighted:
                                vm.leaderboard[i].userId == vm.me.id,
                          ),
                        ],
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

final class _HistoryRow extends StatelessWidget {
  const _HistoryRow({required this.item});

  final UserRatingHistoryItemDto item;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final delta = item.newRating - item.previousRating;
    final sign = delta >= 0 ? '+' : '';

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              '${item.previousRating.round()} → ${item.newRating.round()}',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: scheme.onSurface,
              ),
            ),
          ),
          Text(
            '$sign${delta.round()}',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              color: delta >= 0 ? scheme.primary : scheme.error,
            ),
          ),
        ],
      ),
    );
  }
}

final class _LeaderboardRow extends StatelessWidget {
  const _LeaderboardRow({
    required this.rank,
    required this.name,
    required this.rating,
    this.highlighted = false,
  });

  final int rank;
  final String name;
  final int rating;
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
              '$rank',
              style: TextStyle(
                color: rank == 1
                    ? BrandColors.limeAccent
                    : scheme.onSurfaceVariant,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          CircleAvatar(
            radius: 16,
            backgroundColor: scheme.surfaceContainerHighest,
            child: Text(
              profileInitials(name),
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 12,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              name,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                color: highlighted ? scheme.primary : scheme.onSurface,
              ),
            ),
          ),
          Text(
            '$rating',
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}
