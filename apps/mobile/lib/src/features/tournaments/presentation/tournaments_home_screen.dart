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

final class TournamentsHomeScreen extends StatelessWidget {
  const TournamentsHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
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
    );
  }
}

final class _TournamentsHomeView extends StatefulWidget {
  const _TournamentsHomeView();

  @override
  State<_TournamentsHomeView> createState() => _TournamentsHomeViewState();
}

final class _TournamentsHomeViewState extends State<_TournamentsHomeView> {
  var _section = 'Abiertos';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('tournaments.home'),
      body: BlocBuilder<TournamentsListCubit, TournamentsListState>(
        builder: (context, state) {
          if (state is TournamentsListLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is TournamentsListFailure) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(AppIcons.warning, size: 48),
                  const SizedBox(height: 16),
                  Text(state.message),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () =>
                        context.read<TournamentsListCubit>().load(),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }
          if (state is TournamentsListLoaded) {
            //? "Mis torneos" (M4a, cuadrala-torneos.jsx:150): real data desde
            //? GET /api/v1/users/me/tournaments — ya no una lista hardcodeada.
            final isMine = _section == 'Mis torneos';
            final openItems =
                state.items.where((item) => item.status == 'OPEN').toList();
            final mineItems = state.myTournaments;
            final isEmpty = isMine ? mineItems.isEmpty : openItems.isEmpty;
            return SafeArea(
              child: Column(
                children: [
                  _TournamentsHeader(
                    onCreate: () => context.push(Routes.createTournament),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                    child: SegmentedControl<String>(
                      options: const [
                        SegmentedOption(value: 'Abiertos', label: 'Abiertos'),
                        SegmentedOption(
                          value: 'Mis torneos',
                          label: 'Mis torneos',
                        ),
                      ],
                      value: _section,
                      onChanged: (value) => setState(() => _section = value),
                    ),
                  ),
                  if (!isMine)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                      child: Row(
                        children: [
                          //? "Mi categoría {N}" (cuadrala-torneos.jsx:188):
                          //? sólo se dibuja cuando el visor tiene categoría
                          //? propia (M3c-1's hasOwnCategory). Tocarlo alterna
                          //? el filtro de categoría vía el applyFilters ya
                          //? existente del cubit, sin reinventar esa lógica.
                          if (state.hasOwnCategory)
                            _CategoryFilterChip(
                              label:
                                  'Mi categoría ${state.ownCategoryLabel}',
                              selected: state.filters.categoryId != null,
                              onTap: () {
                                final cubit =
                                    context.read<TournamentsListCubit>();
                                if (state.filters.categoryId != null) {
                                  cubit.applyFilters(
                                    state.filters.copyWith(
                                      clearCategoryId: true,
                                    ),
                                  );
                                } else {
                                  cubit.applyFilters(
                                    state.filters.copyWith(
                                      categoryId: state.ownCategoryId,
                                    ),
                                  );
                                }
                              },
                            ),
                          if (state.hasOwnCategory) const SizedBox(width: 8),
                          //? "Cerca" (M3d, cuadrala-torneos.jsx:189): activo
                          //? sólo cuando `near` se resolvió (ubicación
                          //? guardada u GPS); si ninguna resuelve el chip se
                          //? queda inactivo, sin filtro roto.
                          _CategoryFilterChip(
                            label: 'Cerca',
                            selected: state.filters.near != null,
                            icon: AppIcons.pin,
                            onTap: () => context
                                .read<TournamentsListCubit>()
                                .toggleNear(),
                          ),
                        ],
                      ),
                    ),
                  Expanded(
                    child: isEmpty
                        ? _EmptyState(mine: isMine)
                        : NotificationListener<ScrollNotification>(
                            onNotification: (notification) {
                              if (!isMine &&
                                  notification is ScrollEndNotification &&
                                  notification.metrics.pixels >=
                                      notification.metrics.maxScrollExtent -
                                          100) {
                                context.read<TournamentsListCubit>().loadMore();
                              }
                              return false;
                            },
                            child: RefreshIndicator(
                              onRefresh: () =>
                                  context.read<TournamentsListCubit>().load(),
                              child: ListView.builder(
                                padding: const EdgeInsets.fromLTRB(
                                  16,
                                  8,
                                  16,
                                  24,
                                ),
                                itemCount: isMine
                                    ? mineItems.length
                                    : openItems.length +
                                        (state.isLoadingMore ? 1 : 0),
                                itemBuilder: (ctx, index) {
                                  if (isMine) {
                                    return _ViewerTournamentTile(
                                      item: mineItems[index],
                                    );
                                  }
                                  if (index == openItems.length) {
                                    return const Padding(
                                      padding: EdgeInsets.symmetric(
                                        vertical: 16,
                                      ),
                                      child: Center(
                                        child: CircularProgressIndicator(),
                                      ),
                                    );
                                  }
                                  return TournamentListItemTile(
                                    tournament: openItems[index],
                                  );
                                },
                              ),
                            ),
                          ),
                  ),
                ],
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }
}

final class _TournamentsHeader extends StatelessWidget {
  const _TournamentsHeader({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Torneos',
                  style: Theme.of(context).textTheme.displaySmall?.copyWith(
                    fontSize: 27,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Nivel, precio, fecha y sede antes de anotarte',
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 13.5,
                  ),
                ),
              ],
            ),
          ),
          FilledButton.icon(
            onPressed: onCreate,
            icon: const Icon(AppIcons.add, size: 18),
            label: const Text('Crear'),
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 42),
              padding: const EdgeInsets.symmetric(horizontal: 14),
            ),
          ),
        ],
      ),
    );
  }
}

final class _CategoryFilterChip extends StatelessWidget {
  const _CategoryFilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon ?? (selected ? AppIcons.check : AppIcons.sliders), size: 16),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 38),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        foregroundColor: selected ? scheme.primary : scheme.onSurfaceVariant,
        backgroundColor: selected
            ? scheme.primary.withValues(alpha: 0.12)
            : scheme.surfaceContainerHighest,
        side: BorderSide(
          color: selected ? scheme.primary : scheme.outlineVariant,
        ),
      ),
    );
  }
}

/// Tarjeta de "Mis torneos" (M4a): la tarjeta estándar del listado más el
/// estado de inscripción del visor, sourced de `GET
/// /api/v1/users/me/tournaments` — nunca inventado.
///
/// La fidelidad completa de la insignia (posición, invitaciones, fila de
/// organizador) llega en M4b; acá sólo se muestra el estado real para que
/// "Mis torneos" deje de estar hardcodeado a una lista vacía.
final class _ViewerTournamentTile extends StatelessWidget {
  const _ViewerTournamentTile({required this.item});

  final ViewerTournamentDto item;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final label = _viewerStatusLabelSV(item);
    return Stack(
      children: [
        //? `pendingInvitationId`/`isOrganizer` venían de M4a en el DTO pero
        //? sin cruzar a la tarjeta (M4b-1 los agregó al tile a propósito sin
        //? tocar esta pantalla, ver apply-progress); acá se cierra ese
        //? cableado para que el banner/fila lime de M4b-1 dejen de ser
        //? código muerto.
        TournamentListItemTile(
          tournament: item.tournament,
          pendingInvitationId: item.pendingInvitationId,
          isOrganizer: item.isOrganizer,
        ),
        if (label != null)
          Positioned(
            top: 22,
            right: 26,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: item.registrationStatus == 'CONFIRMED'
                    ? scheme.primary
                    : scheme.onSurfaceVariant,
              ),
            ),
          ),
      ],
    );
  }

  //? cuadrala-torneos.jsx:118-122 — insignia inline: "Adentro" para
  //? CONFIRMED, "Pendiente" para cualquier otro estado de inscripción
  //? vigente. Sin inscripción vigente (sólo invitado u organizador) no se
  //? dibuja nada acá — esos casos tienen su propia UI dedicada en M4b.
  static String? _viewerStatusLabelSV(ViewerTournamentDto item) {
    final status = item.registrationStatus;
    if (status == null) return null;
    return status == 'CONFIRMED' ? 'Adentro' : 'Pendiente';
  }
}

final class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.mine});

  final bool mine;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              AppIcons.trophy,
              size: 30,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(height: 10),
            Text(
              mine
                  ? 'Todavía no te anotaste a ninguno'
                  : 'Nada abierto en tu categoría',
              style: theme.textTheme.titleMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              mine
                  ? 'Cuando te inscribas, va a aparecer acá.'
                  : 'Quitá el filtro para ver el resto.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant.withValues(
                  alpha: 0.7,
                ),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
