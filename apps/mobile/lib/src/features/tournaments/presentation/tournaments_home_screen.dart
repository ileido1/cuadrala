import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/location/location_service.dart';
import '../../../core/theme/app_icons.dart';
import '../../../features/catalog/data/catalog_repository.dart';
import '../../../features/onboarding/data/onboarding_repository.dart';
import '../../../features/profile/data/profile_repository.dart';
import '../../../features/venues/data/venues_repository.dart';
import '../../../router/routes.dart';
import '../data/tournaments_repository.dart';
import '../data/models/viewer_tournament_dto.dart';
import 'cubit/tournaments_list_cubit.dart';
import 'cubit/tournaments_list_state.dart';
import 'widgets/tournament_list_item_tile.dart';
import '../../../shared/widgets/segmented_control.dart';
import '../../../core/theme/tournament_theme.dart';
import '../../../core/formatting/money_conversion.dart';
import '../../../core/formatting/fx_price_labels.dart';
import '../../../core/models/currency_code.dart';
import 'widgets/tournament_primitives.dart';

final class TournamentsHomeScreen extends StatelessWidget {
  const TournamentsHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: TournamentTheme.apply(Theme.of(context)),
      child: BlocProvider(
        create: (_) =>
            TournamentsListCubit(
                tournamentsRepository: getIt<TournamentsRepository>(),
                catalogRepository: getIt<CatalogRepository>(),
                venuesRepository: getIt<VenuesRepository>(),
                profileRepository: getIt<ProfileRepository>(),
                //? Opcionales: en tests que no registran estos dos en getIt,
                //? el chip "Cerca" simplemente no resuelve ubicación (M3d).
                onboardingRepository: getIt.isRegistered<OnboardingRepository>()
                    ? getIt<OnboardingRepository>()
                    : null,
                locationService: getIt.isRegistered<LocationService>()
                    ? getIt<LocationService>()
                    : null,
              )
              ..loadSportsAndCategories()
              ..loadVenues()
              ..load(),
        child: const _TournamentsHomeView(),
      ),
    );
  }
}

final class _TournamentsHomeView extends StatefulWidget {
  const _TournamentsHomeView();

  @override
  State<_TournamentsHomeView> createState() => _TournamentsHomeViewState();
}

final class _TournamentsHomeViewState extends State<_TournamentsHomeView> {
  var _section = 'Explorar';
  List<ExchangeRateRow> _rates = const [];

  @override
  void initState() {
    super.initState();
    loadExchangeRatesSafelySV().then((rates) {
      if (mounted) setState(() => _rates = rates);
    });
  }

  void _open(ViewerTournamentDto viewer) {
    context.push(
      Routes.tournamentDetail(
        viewer.tournament.id,
        invitation: viewer.pendingInvitationId != null && !viewer.isOrganizer,
      ),
      extra: viewer,
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      key: const Key('tournaments.home'),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Padding(
              padding: EdgeInsets.fromLTRB(
                20,
                MediaQuery.paddingOf(context).top.clamp(54, double.infinity),
                20,
                4,
              ),
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Torneos',
                              style: TextStyle(
                                fontSize: 27,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -.5,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Nivel, precio, fecha y sede antes de anotarte',
                              style: TextStyle(
                                fontSize: 13.5,
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      FilledButton.icon(
                        onPressed: () => context.push(Routes.createTournament),
                        icon: const Icon(AppIcons.add, size: 18),
                        label: const Text('Crear'),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 44),
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          textStyle: TextStyle(
                            fontFamily: Theme.of(
                              context,
                            ).textTheme.labelLarge?.fontFamily,
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  SegmentedControl<String>(
                    options: const [
                      SegmentedOption(value: 'Explorar', label: 'Explorar'),
                      SegmentedOption(
                        value: 'Mis torneos',
                        label: 'Mis torneos',
                      ),
                    ],
                    value: _section,
                    onChanged: (value) => setState(() => _section = value),
                  ),
                ],
              ),
            ),
            Expanded(
              child: BlocBuilder<TournamentsListCubit, TournamentsListState>(
                builder: (context, state) {
                  if (state is TournamentsListFailure) {
                    return _error(state.message);
                  }
                  if (state is! TournamentsListLoaded) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  final mine = _section == 'Mis torneos';
                  final visible = state.items
                      .where(
                        (t) => t.visibility == 'PUBLIC' && t.status != 'DRAFT',
                      )
                      .toList();
                  final invited = state.myTournaments
                      .where(
                        (t) => t.pendingInvitationId != null && !t.isOrganizer,
                      )
                      .firstOrNull;
                  return Column(
                    children: [
                      if (!mine) _filters(state),
                      Expanded(
                        child: RefreshIndicator(
                          onRefresh: context.read<TournamentsListCubit>().load,
                          child: NotificationListener<ScrollNotification>(
                            onNotification: (notification) {
                              if (!mine &&
                                  notification.metrics.extentAfter < 240) {
                                context.read<TournamentsListCubit>().loadMore();
                              }
                              return false;
                            },
                            child: ListView(
                              padding: const EdgeInsets.fromLTRB(
                                20,
                                14,
                                20,
                                24,
                              ),
                              children: [
                                if (invited != null)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: TournamentBanner(
                                      tone: TournamentTone.lime,
                                      icon: AppIcons.mail,
                                      title:
                                          'Te invitaron a ${invited.tournament.name}',
                                      body:
                                          invited.tournament.organizerName ==
                                              null
                                          ? 'Revisá los datos y respondé.'
                                          : '${invited.tournament.organizerName} te invitó. Revisá los datos y respondé.',
                                      action: 'Ver invitación',
                                      onAction: () => _open(invited),
                                    ),
                                  ),
                                if (mine && state.myTournamentsError != null)
                                  _error(state.myTournamentsError!)
                                else if (mine) ...[
                                  for (final viewer in state.myTournaments)
                                    _card(viewer, state),
                                  Text(
                                    'Acá aparecen los torneos donde participás, te invitaron u organizás.',
                                    style: TextStyle(
                                      fontSize: 12,
                                      height: 1.5,
                                      color: TournamentTheme.of(context).muted2,
                                    ),
                                  ),
                                ] else ...[
                                  for (final t in visible)
                                    _card(
                                      state.myTournaments
                                              .where(
                                                (v) => v.tournament.id == t.id,
                                              )
                                              .firstOrNull ??
                                          ViewerTournamentDto(
                                            tournament: t,
                                            registrationStatus: null,
                                            pendingInvitationId: null,
                                            pendingRegistrationsCount: null,
                                            isOrganizer: false,
                                          ),
                                      state,
                                    ),
                                  if (visible.isEmpty)
                                    Padding(
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 36,
                                        horizontal: 20,
                                      ),
                                      child: Column(
                                        children: [
                                          Icon(
                                            AppIcons.trophy,
                                            size: 30,
                                            color: TournamentTheme.of(
                                              context,
                                            ).muted2,
                                          ),
                                          const SizedBox(height: 10),
                                          const Text(
                                            'Nada con estos filtros',
                                            style: TextStyle(
                                              fontSize: 14.5,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'Quitá alguno para ver el resto.',
                                            style: TextStyle(
                                              fontSize: 13,
                                              color: scheme.onSurfaceVariant,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  if (state.isLoadingMore)
                                    const Center(
                                      child: CircularProgressIndicator(),
                                    ),
                                  if (state.loadMoreError != null)
                                    _error(state.loadMoreError!, more: true),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ),
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

  Widget _card(
    ViewerTournamentDto viewer,
    TournamentsListLoaded state,
  ) => TournamentListItemTile(
    tournament: viewer.tournament,
    detailExtra: viewer,
    pendingInvitationId: viewer.pendingInvitationId,
    isOrganizer: viewer.isOrganizer,
    registrationStatus: viewer.registrationStatus,
    pendingRegistrationsCount: viewer.pendingRegistrationsCount,
    matchesCategory: viewer.tournament.categoryId == state.ownCategoryId,
    secondaryPriceLabel: viewer.tournament.inscriptionPrice == null
        ? null
        : secondaryBsLabelSV(
            primaryMinor: (viewer.tournament.inscriptionPrice! * 100).round(),
            primaryCurrency: CurrencyCode.usd,
            rates: _rates,
            effectiveDateIso: DateTime.now().toIso8601String().substring(0, 10),
          ),
    onOrganizerTap: () => _open(viewer),
  );

  Widget _error(String message, {bool more = false}) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 36),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(AppIcons.warning, size: 30),
        const SizedBox(height: 12),
        Text(message, textAlign: TextAlign.center),
        TextButton(
          onPressed: () => more
              ? context.read<TournamentsListCubit>().loadMore()
              : context.read<TournamentsListCubit>().load(),
          child: const Text('Reintentar'),
        ),
      ],
    ),
  );

  Widget _filters(TournamentsListLoaded state) {
    final f = state.filters;
    final cubit = context.read<TournamentsListCubit>();
    Widget chip(String label, bool active, VoidCallback action) => Padding(
      padding: const EdgeInsets.only(right: 8),
      child: TournamentFilterChip(label: label, active: active, onTap: action),
    );
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(20, 14, 12, 2),
      child: Row(
        children: [
          chip(
            state.hasOwnCategory
                ? 'Categoría ${state.ownCategoryLabel}'
                : 'Categoría',
            f.categoryId != null,
            () async {
              if (state.hasOwnCategory) {
                cubit.applyFilters(
                  f.copyWith(
                    categoryId: state.ownCategoryId,
                    clearCategoryId: f.categoryId != null,
                  ),
                );
              } else if (f.sportId != null) {
                await cubit.loadCategoriesForSport(f.sportId!);
                if (!mounted) return;
                final value = await _choice(
                  'Categoría',
                  cubit.categories.map((c) => (c.id, c.name)).toList(),
                );
                if (value != null) {
                  cubit.applyFilters(
                    f.copyWith(
                      categoryId: value,
                      clearCategoryId: value.isEmpty,
                    ),
                  );
                }
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Elegí un deporte para filtrar por categoría.',
                    ),
                  ),
                );
              }
            },
          ),
          chip('Cerca', f.near != null, () => cubit.toggleNear()),
          chip('Estado', f.status != null, () async {
            final value = await _choice('Estado', const [
              ('OPEN', 'Inscripción abierta'),
              ('IN_PROGRESS', 'En juego'),
              ('COMPLETED', 'Finalizado'),
              ('CANCELLED', 'Cancelado'),
            ]);
            if (value != null) {
              cubit.applyFilters(
                f.copyWith(status: value, clearStatus: value.isEmpty),
              );
            }
          }),
          chip('Fechas', f.startsAtFrom != null, () async {
            if (f.startsAtFrom != null) {
              cubit.applyFilters(f.copyWith(clearDates: true));
              return;
            }
            final now = DateTime.now();
            final range = await showDateRangePicker(
              context: context,
              firstDate: DateTime(now.year - 1),
              lastDate: DateTime(now.year + 3),
            );
            if (range != null) {
              cubit.applyFilters(
                f.copyWith(
                  startsAtFrom: range.start,
                  startsAtTo: range.end
                      .add(const Duration(days: 1))
                      .subtract(const Duration(milliseconds: 1)),
                ),
              );
            }
          }),
          chip('Sede', f.venueId != null, () async {
            await cubit.loadVenues();
            if (!mounted) return;
            final value = await _choice(
              'Sede',
              cubit.venues.map((v) => (v.id, v.name)).toList(),
            );
            if (value != null) {
              cubit.applyFilters(
                f.copyWith(venueId: value, clearVenueId: value.isEmpty),
              );
            }
          }),
          chip('Deporte', f.sportId != null, () async {
            await cubit.loadSportsAndCategories();
            if (!mounted) return;
            final value = await _choice(
              'Deporte',
              cubit.sports.map((s) => (s.id, s.name)).toList(),
            );
            if (value != null) {
              cubit.applyFilters(
                f.copyWith(
                  sportId: value,
                  clearSportId: value.isEmpty,
                  clearCategoryId: true,
                ),
              );
            }
          }),
        ],
      ),
    );
  }

  Future<String?> _choice(String title, List<(String, String)> options) =>
      showModalBottomSheet<String>(
        context: context,
        isScrollControlled: true,
        builder: (context) => SafeArea(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.sizeOf(context).height * .65,
            ),
            child: ListView(
              shrinkWrap: true,
              children: [
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                ListTile(
                  title: const Text('Todos'),
                  onTap: () => Navigator.pop(context, ''),
                ),
                for (final option in options)
                  ListTile(
                    title: Text(option.$2),
                    onTap: () => Navigator.pop(context, option.$1),
                  ),
              ],
            ),
          ),
        ),
      );
}
