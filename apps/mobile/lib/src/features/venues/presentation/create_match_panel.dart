import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/formatting/fx_price_labels.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/formatting/money_conversion.dart';
import '../../../core/models/currency_code.dart';
import '../../../core/theme/brand_colors.dart';
import '../../../features/catalog/data/catalog_repository.dart';
import '../../../features/matches/data/matches_repository.dart';
import '../../../shared/widgets/date_strip.dart';
import '../../../shared/widgets/dual_price.dart';
import '../../../shared/widgets/segmented_control.dart';
import '../data/models/court_dto.dart';
import '../data/models/venue_dto.dart';
import '../data/venues_repository.dart';
import 'cubit/venue_booking_cubit.dart';
import 'cubit/venue_booking_state.dart';
import 'cubit/venue_map_cubit.dart';
import 'cubit/venue_map_state.dart';
import 'venue_booking_form.dart';
import 'widgets/court_picker.dart';
import 'widgets/venue_card.dart';

/// Abre el panel "Crear partida" como hoja full-screen desde abajo.
Future<void> showCreateMatchSheet(BuildContext context) {
  return showGeneralDialog<void>(
    context: context,
    barrierColor: Colors.black54,
    barrierDismissible: true,
    barrierLabel: 'Cerrar',
    transitionDuration: const Duration(milliseconds: 320),
    transitionBuilder: (ctx, anim, secondaryAnim, child) => SlideTransition(
      position: Tween(
        begin: const Offset(0.0, 1.0),
        end: Offset.zero,
      ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
      child: child,
    ),
    pageBuilder: (dialogContext, anim1, anim2) {
      return Align(
        alignment: Alignment.bottomCenter,
        child: Material(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          clipBehavior: Clip.antiAlias,
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.96,
            width: double.infinity,
            child: BlocProvider<VenueMapCubit>(
              create: (_) => getIt<VenueMapCubit>()..load(),
              child: CreateMatchPanel(
                onMatchCreated: (matchId) {
                  Navigator.of(dialogContext).pop();
                  context.push('/matches/$matchId');
                },
              ),
            ),
          ),
        ),
      );
    },
  );
}

/// Entrada de GoRouter para `/matches/create` (FAB, deep links).
///
/// Reutiliza el mismo sheet slide-up que el hero de Home; al cerrar hace pop
/// de la ruta para no dejar una pantalla vacía en el stack.
final class CreateMatchRouteScreen extends StatefulWidget {
  const CreateMatchRouteScreen({super.key});

  @override
  State<CreateMatchRouteScreen> createState() => _CreateMatchRouteScreenState();
}

class _CreateMatchRouteScreenState extends State<CreateMatchRouteScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _openSheet());
  }

  Future<void> _openSheet() async {
    await showCreateMatchSheet(context);
    if (!mounted) return;
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Colors.transparent,
      body: SizedBox.shrink(),
    );
  }
}

enum _VenueView { lista, mapa }

final class CreateMatchPanel extends StatefulWidget {
  const CreateMatchPanel({super.key, required this.onMatchCreated});

  final void Function(String matchId) onMatchCreated;

  @override
  State<CreateMatchPanel> createState() => _CreateMatchPanelState();
}

class _CreateMatchPanelState extends State<CreateMatchPanel> {
  final _days = buildDateStripDays(21);
  late DateTime _selectedDate = _normalize(DateTime.now());
  VenueDto? _selectedVenue;
  VenueBookingCubit? _bookingCubit;
  _VenueView _view = _VenueView.lista;
  final _scrollController = ScrollController();
  List<ExchangeRateRow> _exchangeRates = const [];

  @override
  void initState() {
    super.initState();
    _loadExchangeRates();
  }

  Future<void> _loadExchangeRates({String? countryCode}) async {
    final rates = await loadExchangeRatesSafelySV(
      countryCode: countryCode ?? 'VE',
    );
    if (mounted) setState(() => _exchangeRates = rates);
  }

  static DateTime _normalize(DateTime d) =>
      DateTime(d.year, d.month, d.day);

  String _keyFor(DateTime date) {
    final normalized = _normalize(date);
    for (final d in _days) {
      if (d.date == normalized) return d.key;
    }
    return _days.first.key;
  }

  DateStripDay _dayFor(DateTime date) {
    final normalized = _normalize(date);
    return _days.firstWhere(
      (d) => d.date == normalized,
      orElse: () => _days.first,
    );
  }

  void _onDateChanged(String key) {
    final day = _days.firstWhere((d) => d.key == key, orElse: () => _days.first);
    setState(() => _selectedDate = day.date);
    _bookingCubit?.selectDate(day.date);
  }

  void _onVenueSelected(VenueDto? venue) {
    if (venue?.id == _selectedVenue?.id) return;
    _bookingCubit?.close();
    VenueBookingCubit? next;
    if (venue != null) {
      next = VenueBookingCubit(
        venue: venue,
        venuesRepository: getIt<VenuesRepository>(),
        matchesRepository: getIt<MatchesRepository>(),
        catalogRepository: getIt<CatalogRepository>(),
        initialDate: _selectedDate,
      )..load();
      _loadExchangeRates(countryCode: venue.countryCode);
    }
    setState(() {
      _selectedVenue = venue;
      _bookingCubit = next;
    });
  }

  void _scrollToTop() {
    if (!_scrollController.hasClients) return;
    _scrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  void dispose() {
    _bookingCubit?.close();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selectedDay = _dayFor(_selectedDate);
    final dateLabel = '${selectedDay.dowLabel} ${selectedDay.date.day}';

    return BlocListener<VenueMapCubit, VenueMapState>(
      listenWhen: (prev, curr) =>
          prev.selectedVenue?.id != curr.selectedVenue?.id,
      listener: (_, state) => _onVenueSelected(state.selectedVenue),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            _PanelHeader(onClose: () => Navigator.of(context).pop()),
            const Divider(height: 1),
            Expanded(
              child: _bookingCubit == null
                  ? _UnifiedScroll(
                      scrollController: _scrollController,
                      days: _days,
                      dateKey: _keyFor(_selectedDate),
                      onDateChanged: _onDateChanged,
                      view: _view,
                      onChangeView: (v) => setState(() => _view = v),
                      selectedVenue: null,
                      bookingState: null,
                      dateLabel: dateLabel,
                      onScrollToTop: _scrollToTop,
                      exchangeRates: _exchangeRates,
                    )
                  : BlocProvider.value(
                      value: _bookingCubit!,
                      child: BlocConsumer<VenueBookingCubit, VenueBookingState>(
                        listener: (context, state) {
                          final matchId = state.submittedMatchId;
                          if (matchId != null) {
                            widget.onMatchCreated(matchId);
                            return;
                          }
                          final error = state.error;
                          if (error != null &&
                              !state.loading &&
                              !state.submitting) {
                            ScaffoldMessenger.of(context)
                              ..clearSnackBars()
                              ..showSnackBar(
                                SnackBar(content: Text(error)),
                              );
                          }
                        },
                        builder: (context, bookingState) {
                          return Column(
                            children: [
                              Expanded(
                                child: _UnifiedScroll(
                                  scrollController: _scrollController,
                                  days: _days,
                                  dateKey: _keyFor(_selectedDate),
                                  onDateChanged: _onDateChanged,
                                  view: _view,
                                  onChangeView: (v) =>
                                      setState(() => _view = v),
                                  selectedVenue: _selectedVenue,
                                  bookingState: bookingState,
                                  dateLabel: dateLabel,
                                  onScrollToTop: _scrollToTop,
                                  exchangeRates: _exchangeRates,
                                ),
                              ),
                                if (!bookingState.loading)
                                  VenueBookingStickyFooter(
                                    state: bookingState,
                                    dateLabel: dateLabel,
                                    onSubmit: _bookingCubit!.submit,
                                    exchangeRates: _exchangeRates,
                                    selectedDate: _selectedDate,
                                  ),
                            ],
                          );
                        },
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UnifiedScroll extends StatelessWidget {
  const _UnifiedScroll({
    required this.scrollController,
    required this.days,
    required this.dateKey,
    required this.onDateChanged,
    required this.view,
    required this.onChangeView,
    required this.selectedVenue,
    required this.bookingState,
    required this.dateLabel,
    required this.onScrollToTop,
    required this.exchangeRates,
  });

  final ScrollController scrollController;
  final List<DateStripDay> days;
  final String dateKey;
  final ValueChanged<String> onDateChanged;
  final _VenueView view;
  final ValueChanged<_VenueView> onChangeView;
  final VenueDto? selectedVenue;
  final VenueBookingState? bookingState;
  final String dateLabel;
  final VoidCallback onScrollToTop;
  final List<ExchangeRateRow> exchangeRates;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<VenueMapCubit>();
    final bookingCubit = bookingState != null
        ? context.read<VenueBookingCubit>()
        : null;

    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      children: [
        const _SectionLabel('Cuándo', required: true),
        const SizedBox(height: 10),
        DateStrip(days: days, value: dateKey, onChanged: onDateChanged),
        const SizedBox(height: 24),
        const _SectionLabel('Dónde', required: true),
        const SizedBox(height: 10),
        TextField(
          onChanged: cubit.search,
          decoration: const InputDecoration(
            hintText: 'Buscar club o dirección',
            prefixIcon: Icon(Icons.search_rounded),
          ),
        ),
        const SizedBox(height: 12),
        SegmentedControl<_VenueView>(
          value: view,
          onChanged: onChangeView,
          options: const [
            SegmentedOption(
              value: _VenueView.lista,
              label: 'Lista',
              icon: Icons.view_list_rounded,
            ),
            SegmentedOption(
              value: _VenueView.mapa,
              label: 'Mapa',
              icon: Icons.map_rounded,
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (view == _VenueView.mapa) ...[
          const _CompactVenueMap(height: 188),
          const SizedBox(height: 12),
        ],
        _VenueListSection(
          selectedVenue: selectedVenue,
          bookingState: bookingState,
          dateLabel: dateLabel,
          exchangeRates: exchangeRates,
          selectedDate: _dayFromKey(days, dateKey),
          onSelectVenue: cubit.selectVenue,
          onSelectCourt: bookingCubit?.selectCourt,
          onSelectSlot: bookingCubit?.selectSlot,
          onChangeDate: onScrollToTop,
        ),
        if (bookingState != null) ...[
          const SizedBox(height: 24),
          if (bookingState!.loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            MatchSettingsSection(
              state: bookingState!,
              cubit: bookingCubit!,
            ),
        ],
      ],
    );
  }
}

class _VenueListSection extends StatelessWidget {
  const _VenueListSection({
    required this.selectedVenue,
    required this.bookingState,
    required this.dateLabel,
    required this.exchangeRates,
    required this.selectedDate,
    required this.onSelectVenue,
    required this.onSelectCourt,
    required this.onSelectSlot,
    required this.onChangeDate,
  });

  final VenueDto? selectedVenue;
  final VenueBookingState? bookingState;
  final String dateLabel;
  final List<ExchangeRateRow> exchangeRates;
  final DateTime selectedDate;
  final void Function(VenueDto? venue) onSelectVenue;
  final void Function(String courtId)? onSelectCourt;
  final void Function(String iso)? onSelectSlot;
  final VoidCallback onChangeDate;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<VenueMapCubit, VenueMapState>(
      builder: (context, state) {
        if (state.status == VenueMapStatus.loading) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: CircularProgressIndicator()),
          );
        }
        if (state.status == VenueMapStatus.failure) {
          return _SelectorError(
            onRetry: context.read<VenueMapCubit>().load,
            message: state.error,
          );
        }
        if (state.filtered.isEmpty) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Text(
              'Sin resultados para "${state.searchQuery}".',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          );
        }

        return Column(
          children: [
            for (final venue in state.filtered) ...[
              VenueCard(
                name: venue.name,
                imageUrl: venue.imageUrl,
                rating: venue.averageRating,
                subtitle: _venueSubtitle(venue),
                tags: _venueTags(venue, bookingState),
                price: _venuePrice(
                  venue,
                  bookingState,
                  exchangeRates: exchangeRates,
                  selectedDate: selectedDate,
                ),
                selected: selectedVenue?.id == venue.id,
                onTap: () => onSelectVenue(
                  selectedVenue?.id == venue.id ? null : venue,
                ),
              ),
              if (selectedVenue?.id == venue.id &&
                  bookingState != null &&
                  onSelectCourt != null &&
                  onSelectSlot != null) ...[
                const SizedBox(height: 10),
                CourtPicker(
                  courts: bookingState!.courts
                      .where((c) => c.status == 'ACTIVE')
                      .toList(),
                  selectedCourtId: bookingState!.selectedCourtId,
                  selectedSlot: bookingState!.selectedSlot,
                  slotsByCourtId: bookingState!.slotsByCourtId,
                  loadingCourtId: bookingState!.slotsLoadingCourtId,
                  dateLabel: dateLabel,
                  onSelectCourt: onSelectCourt!,
                  onSelectSlot: onSelectSlot!,
                  onChangeDate: onChangeDate,
                ),
              ],
              const SizedBox(height: 10),
            ],
          ],
        );
      },
    );
  }

  static String? _venueSubtitle(VenueDto venue) {
    final parts = <String>[
      if (venue.address != null && venue.address!.isNotEmpty) venue.address!,
      if (venue.distanceKm != null)
        '${venue.distanceKm!.toStringAsFixed(1)} km',
    ];
    return parts.isEmpty ? null : parts.join(' · ');
  }

  static List<String> _venueTags(VenueDto venue, VenueBookingState? booking) {
    if (booking == null || booking.venue.id != venue.id) return const [];
    final courts = booking.courts.where((c) => c.status == 'ACTIVE').toList();
    if (courts.isEmpty) return const [];
    final tags = <String>[];
    final outdoor = courts.any((c) => !c.indoor);
    final indoor = courts.any((c) => c.indoor);
    if (outdoor) tags.add('Exterior');
    if (indoor) tags.add('Interior');
    tags.add('${courts.length} ${courts.length == 1 ? 'cancha' : 'canchas'}');
    return tags;
  }

  static Widget? _venuePrice(
    VenueDto venue,
    VenueBookingState? booking, {
    required List<ExchangeRateRow> exchangeRates,
    required DateTime selectedDate,
  }) {
    if (booking == null || booking.venue.id != venue.id) return null;
    final minCents = _minHourlyCents(booking.courts);
    if (minCents == null) return null;
    final currency = CurrencyCode.resolve(
      pricingCurrency: venue.pricingCurrency,
    );
    final dateIso = localCalendarDateIsoSV(selectedDate);
    return DualPrice(
      primaryLabel: formatMoneyFromMinor(minCents, currency),
      secondaryLabel: secondaryBsLabelSV(
        primaryMinor: minCents,
        primaryCurrency: currency,
        rates: exchangeRates,
        effectiveDateIso: dateIso,
      ),
      suffix: '/h',
      primarySize: 14,
    );
  }

  static int? _minHourlyCents(List<CourtDto> courts) {
    final active = courts.where((c) => c.status == 'ACTIVE').toList();
    if (active.isEmpty) return null;
    return active
        .map((c) => c.pricePerHourCents)
        .reduce((a, b) => a < b ? a : b);
  }
}

class _CompactVenueMap extends StatelessWidget {
  const _CompactVenueMap({required this.height});

  final double height;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<VenueMapCubit, VenueMapState>(
      builder: (context, state) {
        final cubit = context.read<VenueMapCubit>();
        if (state.status == VenueMapStatus.loading) {
          return SizedBox(
            height: height,
            child: const Center(child: CircularProgressIndicator()),
          );
        }

        final center = LatLng(
          state.userLat ?? -34.6037,
          state.userLng ?? -58.3816,
        );
        final scheme = Theme.of(context).colorScheme;

        return ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: SizedBox(
            height: height,
            child: FlutterMap(
              options: MapOptions(
                initialCenter: center,
                initialZoom: 13,
                onTap: (_, _) => cubit.selectVenue(null),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.cuadrala.mobile',
                ),
                MarkerLayer(
                  markers: [
                    for (final venue in state.filtered)
                      if (venue.latitude != null && venue.longitude != null)
                        Marker(
                          point: LatLng(venue.latitude!, venue.longitude!),
                          width: 40,
                          height: 40,
                          child: GestureDetector(
                            onTap: () => cubit.selectVenue(venue),
                            child: Icon(
                              Icons.location_pin,
                              size: 36,
                              color: state.selectedVenue?.id == venue.id
                                  ? scheme.primary
                                  : BrandColors.warningAmber,
                            ),
                          ),
                        ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _PanelHeader extends StatelessWidget {
  const _PanelHeader({required this.onClose});

  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 12, 12),
      child: Row(
        children: [
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onClose,
            child: Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: scheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Icons.close_rounded, size: 20, color: scheme.onSurface),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Crear partida',
                  style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                    color: scheme.onSurface,
                  ),
                ),
                Text(
                  'Define cuándo, dónde y con quién',
                  style: TextStyle(
                    fontSize: 12.5,
                    color: scheme.onSurfaceVariant,
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

class _SelectorError extends StatelessWidget {
  const _SelectorError({required this.onRetry, this.message});

  final VoidCallback onRetry;
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            message ?? 'No pudimos cargar las sedes.',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          TextButton(onPressed: onRetry, child: const Text('Reintentar')),
        ],
      ),
    );
  }
}

DateTime _dayFromKey(List<DateStripDay> days, String key) {
  return days.firstWhere((d) => d.key == key, orElse: () => days.first).date;
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label, {this.required = false});

  final String label;
  final bool required;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Text.rich(
      TextSpan(
        text: label.toUpperCase(),
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
          color: scheme.onSurfaceVariant,
        ),
        children: [
          if (required)
            TextSpan(text: '  •', style: TextStyle(color: scheme.primary)),
        ],
      ),
    );
  }
}
