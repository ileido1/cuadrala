import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../features/matches/data/matches_repository.dart';
import '../../../features/matches/data/models/open_match_dto.dart';
import '../../../features/matches/presentation/cubit/open_matches_cubit.dart';
import '../../../features/matches/presentation/cubit/open_matches_state.dart';
import '../../../router/routes.dart';
import '../../../shared/widgets/app_header.dart';
import '../data/models/court_dto.dart';
import '../data/venues_repository.dart';
import 'cubit/venue_detail_cubit.dart';
import 'cubit/venue_detail_state.dart';
import 'widgets/date_strip.dart';

final class VenueDetailScreen extends StatelessWidget {
  const VenueDetailScreen({super.key, required this.venueId, required this.venueName});

  final String venueId;
  final String venueName;

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (_) => VenueDetailCubit(
            repository: getIt<VenuesRepository>(),
            venueId: venueId,
          )..load(),
        ),
        BlocProvider(
          create: (_) => OpenMatchesCubit(
            matchesRepository: getIt<MatchesRepository>(),
            venueId: venueId,
          ),
        ),
      ],
      child: VenueDetailView(venueId: venueId, venueName: venueName),
    );
  }
}

/// Public view widget — exposed for testability via BlocProvider.value injection.
final class VenueDetailView extends StatelessWidget {
  const VenueDetailView({super.key, required this.venueId, required this.venueName});

  final String venueId;
  final String venueName;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        key: const Key('venue.detail'),
        body: Column(
          children: [
            AppHeader(title: venueName, showBack: true),
            TabBar(
              tabs: const [
                Tab(text: 'Reservar'),
                Tab(text: 'Partidos'),
                Tab(text: 'Info'),
              ],
            ),
            Expanded(
              child: BlocBuilder<VenueDetailCubit, VenueDetailState>(
                builder: (context, state) {
                  if (state is VenueDetailLoading || state is VenueDetailInitial) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (state is VenueDetailFailure) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(state.message, textAlign: TextAlign.center),
                            const SizedBox(height: 16),
                            FilledButton(
                              onPressed: () =>
                                  context.read<VenueDetailCubit>().load(),
                              child: const Text('Reintentar'),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  final loaded = state as VenueDetailLoaded;
                  return TabBarView(
                    children: [
                      _BookingTab(
                        venueId: venueId,
                        courts: loaded.courts,
                      ),
                      _OpenMatchesTab(venueId: venueId),
                      _InfoTab(venueId: venueId),
                    ],
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

// ---------------------------------------------------------------------------
// Reservar tab
// ---------------------------------------------------------------------------

class _BookingTab extends StatefulWidget {
  const _BookingTab({required this.venueId, required this.courts});

  final String venueId;
  final List<CourtDto> courts;

  @override
  State<_BookingTab> createState() => _BookingTabState();
}

class _BookingTabState extends State<_BookingTab> {
  late DateTime _selectedDate;
  String? _selectedCourtId;
  String? _selectedSlot;

  static const _slots = [
    '08:00', '09:00', '10:00', '11:00',
    '14:00', '16:00', '18:00',
  ];

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selectedDate = DateTime(now.year, now.month, now.day);
  }

  String _buildScheduledAt(String slot) {
    final parts = slot.split(':');
    final hour = int.parse(parts[0]);
    final minute = int.parse(parts[1]);
    return DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      hour,
      minute,
    ).toIso8601String();
  }

  @override
  Widget build(BuildContext context) {
    final hasSelection = _selectedCourtId != null && _selectedSlot != null;

    return Stack(
      children: [
        CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.only(top: 12, bottom: 4),
                child: DateStrip(
                  selectedDate: _selectedDate,
                  onDateSelected: (d) => setState(() {
                    _selectedDate = d;
                    _selectedSlot = null;
                    _selectedCourtId = null;
                  }),
                ),
              ),
            ),
            if (widget.courts.isEmpty)
              const SliverFillRemaining(
                child: Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'No hay canchas disponibles',
                      style: TextStyle(fontWeight: FontWeight.w600),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => _CourtSlotCard(
                      court: widget.courts[index],
                      slots: _slots,
                      selectedSlot: _selectedCourtId == widget.courts[index].id
                          ? _selectedSlot
                          : null,
                      onSlotTap: (slot) => setState(() {
                        _selectedCourtId = widget.courts[index].id;
                        _selectedSlot = slot;
                      }),
                    ),
                    childCount: widget.courts.length,
                  ),
                ),
              ),
          ],
        ),
        if (hasSelection)
          Positioned(
            left: 16,
            right: 16,
            bottom: 16,
            child: SafeArea(
              child: FilledButton.icon(
                onPressed: () {
                  final scheduledAt = _buildScheduledAt(_selectedSlot!);
                  context.push(
                    Routes.venueCreateMatch(widget.venueId),
                    extra: {
                      'courtId': _selectedCourtId,
                      'scheduledAt': scheduledAt,
                    },
                  );
                },
                icon: const Icon(Icons.add),
                label: const Text('Crear partido'),
              ),
            ),
          ),
      ],
    );
  }
}

class _CourtSlotCard extends StatelessWidget {
  const _CourtSlotCard({
    required this.court,
    required this.slots,
    required this.selectedSlot,
    required this.onSlotTap,
  });

  final CourtDto court;
  final List<String> slots;
  final String? selectedSlot;
  final void Function(String slot) onSlotTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: scheme.outlineVariant),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.sports_tennis, color: scheme.primary, size: 18),
                const SizedBox(width: 8),
                Text(
                  court.name,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: slots.map((slot) {
                final isSelected = slot == selectedSlot;
                return FilterChip(
                  label: Text(slot),
                  selected: isSelected,
                  onSelected: (_) => onSlotTap(slot),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Partidos tab
// ---------------------------------------------------------------------------

class _OpenMatchesTab extends StatefulWidget {
  const _OpenMatchesTab({required this.venueId});

  final String venueId;

  @override
  State<_OpenMatchesTab> createState() => _OpenMatchesTabState();
}

class _OpenMatchesTabState extends State<_OpenMatchesTab>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  bool _loaded = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_loaded) {
      _loaded = true;
      context.read<OpenMatchesCubit>().load();
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return BlocBuilder<OpenMatchesCubit, OpenMatchesState>(
      builder: (context, state) {
        if (state is OpenMatchesLoading || state is OpenMatchesInitial) {
          return const Center(child: CircularProgressIndicator());
        }
        if (state is OpenMatchesFailure) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(state.message, textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () => context.read<OpenMatchesCubit>().load(),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            ),
          );
        }
        final loaded = state as OpenMatchesLoaded;
        final matches = loaded.visibleItems;

        if (matches.isEmpty) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'No hay partidos abiertos en este local',
                textAlign: TextAlign.center,
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: matches.length,
          itemBuilder: (context, index) => _MatchListTile(
            match: matches[index],
            onTap: () => context.push(Routes.matchDetail(matches[index].id)),
          ),
        );
      },
    );
  }
}

class _MatchListTile extends StatelessWidget {
  const _MatchListTile({required this.match, required this.onTap});

  final OpenMatchDto match;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    final courtName = match.courtName ?? 'Cancha';
    final scheduledAt = match.scheduledAt;
    final dateStr = scheduledAt != null
        ? '${scheduledAt.toLocal().day}/${scheduledAt.toLocal().month} '
            '${scheduledAt.toLocal().hour.toString().padLeft(2, '0')}:'
            '${scheduledAt.toLocal().minute.toString().padLeft(2, '0')}'
        : 'Sin fecha';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: scheme.primaryContainer,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.sports_tennis,
                    color: scheme.onPrimaryContainer, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      courtName,
                      style: textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w700),
                    ),
                    Text(
                      dateStr,
                      style: textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              Chip(
                label: Text(
                  '${match.openSpots} libre${match.openSpots == 1 ? '' : 's'}',
                ),
                padding: EdgeInsets.zero,
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Info tab
// ---------------------------------------------------------------------------

class _InfoTab extends StatelessWidget {
  const _InfoTab({required this.venueId});

  final String venueId;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<VenueDetailCubit, VenueDetailState>(
      builder: (context, state) {
        // Info tab shows venue-level data.
        // VenueDetailCubit currently loads courts — the info data comes from
        // a separate getVenueDetail call (not wired in this cubit yet).
        // For MVP, show a placeholder with key for testability; PR-4 will
        // wire actual venue detail fields.
        return SingleChildScrollView(
          key: const Key('venue_info_tab'),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Información del local',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 16),
              if (state is VenueDetailLoaded)
                _InfoSection(courts: state.courts)
              else
                const Center(child: CircularProgressIndicator()),
            ],
          ),
        );
      },
    );
  }
}

class _InfoSection extends StatelessWidget {
  const _InfoSection({required this.courts});

  final List<CourtDto> courts;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Canchas disponibles: ${courts.length}',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 12),
        if (courts.isNotEmpty) ...[
          Text(
            'Deportes',
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: scheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            children: courts
                .map((c) => c.sportType)
                .toSet()
                .map((sport) => Chip(label: Text(sport)))
                .toList(),
          ),
        ],
      ],
    );
  }
}
