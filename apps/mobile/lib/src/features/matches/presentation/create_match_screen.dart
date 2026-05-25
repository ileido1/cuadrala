import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/failures/app_failure.dart';
import '../../../core/failures/app_failure_mapper.dart';
import '../../../core/formatting/money_format.dart';
import '../../../core/models/currency_code.dart';
import '../../../core/venue/court_pricing.dart';
import '../../../core/venue/opening_hours.dart';
import '../../../router/routes.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/data/models/category_dto.dart';
import '../../catalog/data/models/sport_dto.dart';
import '../../onboarding/data/models/player_sport_profile_dto.dart';
import '../../onboarding/data/onboarding_repository.dart';
import '../../venues/data/models/court_dto.dart';
import '../../venues/data/models/venue_dto.dart';
import '../../venues/data/venues_repository.dart';
import '../data/matches_repository.dart';

final class CreateMatchScreen extends StatefulWidget {
  const CreateMatchScreen({super.key});

  @override
  State<CreateMatchScreen> createState() => _CreateMatchScreenState();
}

class _CreateMatchScreenState extends State<CreateMatchScreen> {
  final _clubController = TextEditingController();
  final _courtController = TextEditingController();
  final _notesController = TextEditingController();
  late final TextEditingController _priceController =
      TextEditingController(text: _pricePerPlayerCentsInputLabel());

  List<VenueDto> _venues = const [];
  VenueDto? _selectedVenue;
  CourtDto? _selectedCourt;

  List<SportDto> _sports = const [];
  String? _selectedSportId;

  List<CategoryDto> _categories = const [];
  List<PlayerSportProfileDto> _sportProfiles = const [];
  String? _categoryId;
  int _players = 4;
  int _pricePerPlayerCents = 0;

  DateTime _selectedDate = DateTime.now();
  DateTime? _selectedSlotUtc;

  bool _availabilityLoading = false;
  Object? _availabilityError;
  List<_AvailabilitySlot> _slots = const [];
  OpeningHoursMap? _openingHours;
  String _venueTimezone = 'America/Caracas';

  bool _loading = true;
  bool _submitting = false;

  @override
  void dispose() {
    _clubController.dispose();
    _courtController.dispose();
    _notesController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        getIt<CatalogRepository>().listSports(),
        getIt<VenuesRepository>().listVenues(limit: 100),
        getIt<OnboardingRepository>().listSportProfiles(),
      ]);
      final sports = results[0] as List<SportDto>;
      final venues = results[1] as List<VenueDto>;
      final profiles = results[2] as List<PlayerSportProfileDto>;
      String? selectedSport = sports.isEmpty ? null : sports.first.id;
      for (final s in sports) {
        if (s.code.toUpperCase() == 'PADEL') {
          selectedSport = s.id;
          break;
        }
      }
      if (!mounted) return;
      setState(() {
        _sports = sports;
        _venues = venues;
        _sportProfiles = profiles;
        _selectedVenue = null;
        _selectedCourt = null;
        _loading = false;
      });
      await _applySportSelection(selectedSport);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _sports = const [];
        _selectedSportId = null;
        _categories = const [];
        _categoryId = null;
        _venues = const [];
        _sportProfiles = const [];
        _selectedVenue = null;
        _selectedCourt = null;
        _loading = false;
      });
    }
  }

  Future<void> _applySportSelection(String? sportId) async {
    if (sportId == null) {
      setState(() {
        _selectedSportId = null;
        _categories = const [];
        _categoryId = null;
      });
      return;
    }
    final catalog = getIt<CatalogRepository>();
    final filtered = await catalog.listCategories(sportId: sportId);
    if (!mounted) return;

    String? preferred;
    for (final p in _sportProfiles) {
      if (p.sportId == sportId &&
          p.categoryId != null &&
          p.categoryId!.isNotEmpty) {
        preferred = p.categoryId;
        break;
      }
    }
    String? resolved;
    if (preferred != null && filtered.any((c) => c.id == preferred)) {
      resolved = preferred;
    } else if (filtered.isNotEmpty) {
      resolved = filtered.first.id;
    }

    setState(() {
      _selectedSportId = sportId;
      _categories = filtered;
      _categoryId = resolved;
    });
    if (_selectedCourt != null) {
      await _refreshAvailability();
    }
  }

  int? _blockTotalCents() {
    final court = _selectedCourt;
    final slotUtc = _selectedSlotUtc;
    if (court == null || slotUtc == null || court.durationMinutes <= 0) {
      return null;
    }

    final baseCents = court.pricePerHourCents > 0 ? court.pricePerHourCents : null;
    if (baseCents == null && court.pricingTiers.isEmpty) return null;

    return calculateReservationTotalCents(
      basePricePerHourCents: baseCents,
      pricingTiers: court.pricingTiers,
      scheduledAtUtc: slotUtc,
      durationMinutes: court.durationMinutes,
      venueTimezone: _venueTimezone,
    );
  }

  CurrencyCode get _venueCurrency => CurrencyCode.resolve(
        pricingCurrency: _selectedVenue?.pricingCurrency,
      );

  /// Centavos por jugador: reparto con redondeo hacia arriba (no cobrar de menos).
  int? _computedPricePerPlayerCents() {
    final totalCents = _blockTotalCents();
    if (totalCents == null || _players <= 0) return null;
    return splitBlockTotalPerPlayerCents(
      blockTotalCents: totalCents,
      playerCount: _players,
    );
  }

  String _pricePerPlayerCentsInputLabel() {
    if (_pricePerPlayerCents <= 0) return '';
    return (_pricePerPlayerCents / 100).toStringAsFixed(2);
  }

  List<_AvailabilitySlot> _filterDisplaySlots(List<_AvailabilitySlot> slots) {
    final court = _selectedCourt;
    if (court == null) return slots;

    final earliest = earliestSelectableSlotUtc(
      localDate: _selectedDate,
      openingHours: _openingHours,
      venueTimezone: _venueTimezone,
      blockDurationMinutes: court.durationMinutes,
    );

    return slots.where((slot) {
      if (!slot.isAvailable && slot.reason == 'OUT_OF_RANGE') return false;
      if (slot.scheduledAtUtc.isBefore(earliest)) return false;
      return true;
    }).toList(growable: false);
  }

  String _slotChipLabel(_AvailabilitySlot slot) {
    final start = formatSlotTimeInVenueTimezone(
      slot.scheduledAtUtc,
      venueTimezone: _venueTimezone,
    );
    final duration = _selectedCourt?.durationMinutes ?? 60;
    final endUtc =
        slot.scheduledAtUtc.add(Duration(minutes: duration));
    final end = formatSlotTimeInVenueTimezone(
      endUtc,
      venueTimezone: _venueTimezone,
    );
    return '$start – $end';
  }

  Widget _buildCategoryReadOnly(ColorScheme scheme) {
    if (_categoryId == null || _categoryId!.isEmpty) {
      return Text(
        'Completa tu categoría en el perfil para este deporte.',
        style: TextStyle(
          color: scheme.onSurfaceVariant,
          fontWeight: FontWeight.w700,
        ),
      );
    }
    final name = _categories
        .where((c) => c.id == _categoryId)
        .map((c) => c.name)
        .firstOrNull;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          name ?? '—',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Según tu perfil',
          style: TextStyle(
            color: scheme.onSurfaceVariant,
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Future<void> _pickVenueAndCourt() async {
    final selectedVenue = await showModalBottomSheet<VenueDto>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        final scheme = Theme.of(context).colorScheme;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Selecciona una sede',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
                ),
                const SizedBox(height: 10),
                if (_venues.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: scheme.surfaceContainerHighest.withValues(alpha: 0.65),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.6)),
                    ),
                    child: Text(
                      'Aún no hay sedes disponibles.\nIntenta más tarde o cambia tu ubicación.',
                      style: TextStyle(
                        color: scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w700,
                        height: 1.35,
                      ),
                    ),
                  )
                else
                  Flexible(
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: _venues.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, i) {
                        final v = _venues[i];
                        return ListTile(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          tileColor: scheme.surfaceContainerHighest.withValues(alpha: 0.55),
                          title: Text(
                            v.name,
                            style: const TextStyle(fontWeight: FontWeight.w900),
                          ),
                          subtitle: v.address == null
                              ? null
                              : Text(
                                  v.address!,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: scheme.onSurfaceVariant,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                          leading: Icon(Icons.location_on_outlined, color: scheme.primary),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => Navigator.of(context).pop(v),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );

    if (selectedVenue == null) return;
    if (!mounted) return;

    OpeningHoursMap? openingHours = selectedVenue.openingHours;
    var venueTimezone = selectedVenue.timezone ?? 'America/Caracas';
    try {
      final detail =
          await getIt<VenuesRepository>().getVenueDetail(venueId: selectedVenue.id);
      openingHours = detail.openingHours ?? openingHours;
      venueTimezone = detail.timezone ?? venueTimezone;
    } catch (_) {}

    if (!mounted) return;

    final selectedCourt = await showModalBottomSheet<CourtDto>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        final scheme = Theme.of(context).colorScheme;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Canchas — ${selectedVenue.name}',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
                ),
                const SizedBox(height: 10),
                FutureBuilder<List<CourtDto>>(
                  future: getIt<VenuesRepository>().listVenueCourts(venueId: selectedVenue.id),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    if (snapshot.hasError) {
                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: scheme.error.withValues(alpha: 0.10),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: scheme.error.withValues(alpha: 0.25)),
                        ),
                        child: Text(
                          'No se pudieron cargar las canchas.\n${snapshot.error}',
                          style: TextStyle(
                            color: scheme.onSurfaceVariant,
                            fontWeight: FontWeight.w700,
                            height: 1.35,
                          ),
                        ),
                      );
                    }
                    final courts = snapshot.data ?? const <CourtDto>[];
                    if (courts.isEmpty) {
                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: scheme.surfaceContainerHighest.withValues(alpha: 0.65),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.6)),
                        ),
                        child: Text(
                          'Esta sede no tiene canchas registradas.\nCrea canchas en el backend para poder publicarla.',
                          style: TextStyle(
                            color: scheme.onSurfaceVariant,
                            fontWeight: FontWeight.w700,
                            height: 1.35,
                          ),
                        ),
                      );
                    }
                    return Flexible(
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: courts.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, i) {
                          final c = courts[i];
                          return ListTile(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            tileColor: scheme.surfaceContainerHighest.withValues(alpha: 0.55),
                            title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w900)),
                            leading: Icon(Icons.sports_tennis_outlined, color: scheme.primary),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () => Navigator.of(context).pop(c),
                          );
                        },
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );

    if (selectedCourt == null) return;
    setState(() {
      _selectedVenue = selectedVenue;
      _selectedCourt = selectedCourt;
      _openingHours = openingHours;
      _venueTimezone = venueTimezone;
      _clubController.text = selectedVenue.name;
      _courtController.text = selectedCourt.name;
      _selectedSlotUtc = null;
    });
    _applyComputedPrice();
    await _refreshAvailability();
  }

  void _applyComputedPrice() {
    final perPlayerCents = _computedPricePerPlayerCents();
    if (perPlayerCents == null || !mounted) return;
    setState(() {
      _pricePerPlayerCents = perPlayerCents;
      _priceController.text = (perPlayerCents / 100).toStringAsFixed(2);
    });
  }

  String _availabilityErrorLabel(Object? error) {
    if (error is AppFailure) return error.message;
    if (error is String) return error;
    return 'No se pudo cargar horarios';
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 0)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null) return;
    setState(() {
      _selectedDate = picked;
      _selectedSlotUtc = null;
    });
    await _refreshAvailability();
  }

  String _isoDateForSelected() {
    final d = _selectedDate;
    return '${d.year.toString().padLeft(4, '0')}-'
        '${d.month.toString().padLeft(2, '0')}-'
        '${d.day.toString().padLeft(2, '0')}';
  }

  DateTime _availabilityFromUtc() {
    final window = availabilityWindowUtcForLocalDate(
      localDate: _selectedDate,
      openingHours: _openingHours,
      venueTimezone: _venueTimezone,
    );
    return window.fromUtc;
  }

  DateTime _availabilityToUtc() {
    final window = availabilityWindowUtcForLocalDate(
      localDate: _selectedDate,
      openingHours: _openingHours,
      venueTimezone: _venueTimezone,
    );
    return window.toUtc;
  }

  Future<void> _refreshAvailability() async {
    final venueId = _selectedVenue?.id;
    final courtId = _selectedCourt?.id;
    if (venueId == null || courtId == null) {
      if (!mounted) return;
      setState(() {
        _availabilityLoading = false;
        _availabilityError = null;
        _slots = const [];
      });
      return;
    }

    final sportId = _selectedSportId;
    final categoryId = _categoryId;
    if (sportId == null ||
        sportId.isEmpty ||
        categoryId == null ||
        categoryId.isEmpty) {
      if (!mounted) return;
      setState(() {
        _availabilityLoading = false;
        _availabilityError =
            'Completa tu categoría en el perfil para ver horarios.';
        _slots = const [];
      });
      return;
    }

    final isoDate = _isoDateForSelected();
    if (!isVenueOpenOnDate(isoDate, _openingHours)) {
      if (!mounted) return;
      setState(() {
        _availabilityLoading = false;
        _availabilityError = closedDayMessage(isoDate, _openingHours);
        _slots = const [];
      });
      return;
    }

    setState(() {
      _availabilityLoading = true;
      _availabilityError = null;
      _slots = const [];
    });

    try {
      final durationMinutes = _selectedCourt?.durationMinutes ?? 60;
      final stepMinutes = durationMinutes;
      final data = await getIt<VenuesRepository>().getVenueAvailability(
        venueId: venueId,
        courtId: courtId,
        from: _availabilityFromUtc(),
        to: _availabilityToUtc(),
        durationMinutes: durationMinutes,
        stepMinutes: stepMinutes,
        sportId: sportId,
        categoryId: categoryId,
      );

      final courtsRaw = data['courts'];
      if (courtsRaw is! List) {
        throw Exception('Respuesta inválida: courts');
      }
      final mappedCourts = courtsRaw.whereType<Map<String, Object?>>().toList();
      if (mappedCourts.isEmpty) {
        throw Exception('Respuesta inválida: sin courts');
      }
      final courtEntry = mappedCourts.first;
      final slotsRaw = courtEntry['slots'];
      if (slotsRaw is! List) {
        throw Exception('Respuesta inválida: slots');
      }

      final slots = <_AvailabilitySlot>[];
      for (final s in slotsRaw.whereType<Map<String, Object?>>()) {
        final at = s['scheduledAt'];
        if (at is! String) continue;
        slots.add(
          _AvailabilitySlot(
            scheduledAtUtc: DateTime.parse(at),
            isAvailable: s['isAvailable'] == true,
            reason: s['reason'] as String?,
          ),
        );
      }

      if (!mounted) return;
      setState(() {
        _availabilityLoading = false;
        _availabilityError = null;
        _slots = _filterDisplaySlots(slots);
      });
    } catch (e) {
      if (!mounted) return;
      final failure = e is AppFailure
          ? e
          : getIt<AppFailureMapper>().fromException(e);
      setState(() {
        _availabilityLoading = false;
        _availabilityError = failure;
        _slots = const [];
      });
    }
  }

  Future<void> _submit() async {
    final sportId = _selectedSportId;
    if (sportId == null || sportId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona un deporte.')),
      );
      return;
    }
    if (_categoryId == null || _categoryId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona una categoría.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final courtId = _selectedCourt?.id;
      final venueId = _selectedVenue?.id;
      if (courtId == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Selecciona una sede y una cancha.')),
        );
        return;
      }
      if (venueId == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Selecciona una sede.')),
        );
        return;
      }
      final slotUtc = _selectedSlotUtc;
      if (slotUtc == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Selecciona un horario disponible.')),
        );
        return;
      }
      final created = await getIt<MatchesRepository>().createMatch(
        sportId: sportId,
        categoryId: _categoryId!,
        type: 'REGULAR',
        scheduledAt: slotUtc,
        courtId: courtId,
        venueId: venueId,
        maxParticipants: _players,
        pricePerPlayerCents: _pricePerPlayerCents,
        durationMinutes: _selectedCourt!.durationMinutes,
        notes: _notesController.text.trim().isEmpty
            ? null
            : _notesController.text.trim(),
      );
      if (!mounted) return;
      context.go(Routes.matchDetail(created.id));
    } catch (e) {
      if (!mounted) return;
      if (e is AppFailure) {
        await _showCreateMatchFailureDialog(e);
        return;
      }
      await _showCreateMatchFailureDialog(
        AppFailure(code: 'UNKNOWN', message: 'No se pudo publicar la partida.', details: e),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _showCreateMatchFailureDialog(AppFailure failure) {
    final scheme = Theme.of(context).colorScheme;

    String title = 'No se pudo publicar';
    String message = failure.message;

    String? conflictingMatchId;
    final details = failure.details;
    if (details is Map) {
      final raw = details['conflictingMatchId'];
      if (raw is String && raw.isNotEmpty) conflictingMatchId = raw;
    }

    switch (failure.code) {
      case 'CANCHA_OCUPADA':
        title = 'Cancha ocupada';
        message =
            'La cancha ya tiene un partido en ese horario. Elige otra hora o revisa la partida existente.';
        break;
      case 'HORARIO_RESERVA_INCOMPATIBLE':
        title = 'Horario no disponible';
        message =
            'Ese horario está publicado para otra categoría o deporte. Cambia el horario o ajusta la categoría.';
        break;
      case 'CANCHA_NO_EN_SEDE':
        title = 'Cancha inválida';
        message =
            'La cancha no pertenece a la sede seleccionada. Vuelve a elegir sede y cancha.';
        break;
      default:
        break;
    }

    return showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
          content: SelectableText.rich(
            TextSpan(
              children: [
                TextSpan(text: message),
                if (conflictingMatchId != null) ...[
                  const TextSpan(text: '\n\n'),
                  TextSpan(
                    text: 'Partido en conflicto: $conflictingMatchId',
                    style: TextStyle(color: scheme.onSurfaceVariant),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            if (conflictingMatchId != null)
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  context.go(Routes.matchDetail(conflictingMatchId!));
                },
                child: const Text('Ver partido'),
              ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cerrar'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      key: const Key('create.match.screen'),
      appBar: AppBar(title: const Text('Nueva Partida')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _SectionCard(
                          title: 'Deporte',
                          child: Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _sports
                                .map(
                                  (s) => ChoiceChip(
                                    label: Text(s.name),
                                    selected: _selectedSportId == s.id,
                                    onSelected: (_) =>
                                        _applySportSelection(s.id),
                                    selectedColor: scheme.primary,
                                    labelStyle: TextStyle(
                                      color: _selectedSportId == s.id
                                          ? scheme.onPrimary
                                          : scheme.onSurface,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        _SectionCard(
                          title: 'Sede / Cancha',
                          footer: _selectedCourt == null
                              ? 'Selecciona una sede y una cancha para publicar.'
                              : (_selectedVenue?.address == null || _selectedVenue!.address!.trim().isEmpty)
                                  ? null
                                  : _selectedVenue!.address!,
                          child: Column(
                            children: [
                              TextField(
                                controller: _clubController,
                                textInputAction: TextInputAction.next,
                                readOnly: true,
                                decoration: InputDecoration(
                                  prefixIcon: const Icon(Icons.location_on_outlined),
                                  hintText: 'Selecciona una sede…',
                                  suffixIcon: IconButton(
                                    tooltip: 'Elegir sede/cancha',
                                    onPressed: _pickVenueAndCourt,
                                    icon: const Icon(Icons.list_alt_outlined),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 10),
                              TextField(
                                controller: _courtController,
                                textInputAction: TextInputAction.done,
                                readOnly: true,
                                decoration: const InputDecoration(
                                  prefixIcon: Icon(Icons.sports_tennis_outlined),
                                  hintText: 'Selecciona una cancha…',
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: _SectionCard(
                                title: 'Fecha',
                                child: _CompactButton(
                                  icon: Icons.calendar_month,
                                  label: _formatDateShort(_selectedDate),
                                  onTap: _pickDate,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _SectionCard(
                                title: 'Horario',
                                child: _availabilityLoading
                                    ? const Padding(
                                        padding: EdgeInsets.symmetric(vertical: 6),
                                        child: Center(child: CircularProgressIndicator()),
                                      )
                                    : _selectedVenue == null || _selectedCourt == null
                                        ? const Text(
                                            'Selecciona sede/cancha',
                                            style: TextStyle(fontWeight: FontWeight.w700),
                                          )
                                        : _availabilityError != null
                                            ? Text(
                                                _availabilityErrorLabel(
                                                  _availabilityError,
                                                ),
                                                style: TextStyle(
                                                  fontWeight: FontWeight.w700,
                                                  color: scheme.error,
                                                  fontSize: 12,
                                                ),
                                              )
                                            : _slots.isEmpty
                                                ? const Text(
                                                    'Sin horarios',
                                                    style: TextStyle(
                                                      fontWeight: FontWeight.w700,
                                                    ),
                                                  )
                                                : Wrap(
                                                    spacing: 8,
                                                    runSpacing: 8,
                                                    children: _slots.map((slot) {
                                                      final label =
                                                          _slotChipLabel(slot);
                                                      final selected =
                                                          _selectedSlotUtc ==
                                                              slot
                                                                  .scheduledAtUtc;
                                                      final enabled =
                                                          slot.isAvailable;
                                                      return ChoiceChip(
                                                        label: Text(
                                                          label,
                                                          style: TextStyle(
                                                            fontWeight:
                                                                FontWeight.w900,
                                                            color: !enabled
                                                                ? scheme
                                                                    .onSurfaceVariant
                                                                : selected
                                                                    ? scheme
                                                                        .onPrimary
                                                                    : scheme
                                                                        .onSurface,
                                                            decoration: enabled
                                                                ? null
                                                                : TextDecoration
                                                                    .lineThrough,
                                                          ),
                                                        ),
                                                        selected:
                                                            selected && enabled,
                                                        onSelected: enabled
                                                            ? (_) {
                                                                setState(
                                                                  () =>
                                                                      _selectedSlotUtc =
                                                                          slot.scheduledAtUtc,
                                                                );
                                                                _applyComputedPrice();
                                                              }
                                                            : null,
                                                        selectedColor:
                                                            scheme.primary,
                                                        disabledColor: scheme
                                                            .outlineVariant
                                                            .withValues(
                                                              alpha: 0.35,
                                                            ),
                                                        tooltip: enabled
                                                            ? null
                                                            : _slotUnavailableTooltip(
                                                                slot,
                                                              ),
                                                      );
                                                    }).toList(),
                                                  ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child:                         _SectionCard(
                          title: 'Categoría',
                          child: _buildCategoryReadOnly(scheme),
                        ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _SectionCard(
                                title: 'Jugadores',
                                child: Row(
                                  children: [
                                    IconButton(
                                      onPressed: _players <= 2
                                          ? null
                                          : () {
                                              setState(() => _players--);
                                              _applyComputedPrice();
                                            },
                                      icon: const Icon(Icons.remove_circle_outline),
                                    ),
                                    Text(
                                      '$_players',
                                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                            fontWeight: FontWeight.w900,
                                          ),
                                    ),
                                    IconButton(
                                      onPressed: _players >= 10
                                          ? null
                                          : () {
                                              setState(() => _players++);
                                              _applyComputedPrice();
                                            },
                                      icon: const Icon(Icons.add_circle_outline),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _SectionCard(
                          title: 'Precio por persona',
                          child: Builder(
                            builder: (context) {
                              final blockCents = _blockTotalCents();
                              final perPlayerCents =
                                  _computedPricePerPlayerCents();
                              final court = _selectedCourt;
                              final hasPricing = court != null &&
                                  (court.pricePerHourCents > 0 ||
                                      court.pricingTiers.isNotEmpty);
                              if (perPlayerCents == null &&
                                  hasPricing &&
                                  _selectedSlotUtc == null) {
                                return Text(
                                  'Seleccioná un horario para ver el precio.',
                                  style: TextStyle(
                                    color: scheme.onSurfaceVariant,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 12,
                                  ),
                                );
                              }
                              if (perPlayerCents != null &&
                                  blockCents != null) {
                                final duration =
                                    court?.durationMinutes ?? 60;
                                final hoursLabel = duration % 60 == 0
                                    ? '${duration ~/ 60} h'
                                    : '${duration ~/ 60} h ${duration % 60} min';
                                return Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      formatMoneyLabel(
                                        perPlayerCents,
                                        _venueCurrency,
                                      ),
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleLarge
                                          ?.copyWith(
                                            fontWeight: FontWeight.w900,
                                          ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'por persona · $_players jugadores',
                                      style: TextStyle(
                                        color: scheme.onSurfaceVariant,
                                        fontWeight: FontWeight.w600,
                                        fontSize: 12,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Bloque $hoursLabel: '
                                      '${formatMoneyLabel(blockCents, _venueCurrency)} '
                                      'total (tarifa del horario)',
                                      style: TextStyle(
                                        color: scheme.onSurfaceVariant,
                                        fontWeight: FontWeight.w500,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ],
                                );
                              }
                              return TextField(
                                controller: _priceController,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                  prefixIcon: Icon(Icons.attach_money),
                                  helperText:
                                      'La cancha no tiene precio configurado; '
                                      'ingresá un monto manual.',
                                ),
                                onChanged: (v) => setState(() {
                                  _pricePerPlayerCents =
                                      parseMoneyInputToMinor(v) ??
                                          _pricePerPlayerCents;
                                }),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 12),
                        _SectionCard(
                          title: 'Notas (opcional)',
                          child: TextField(
                            controller: _notesController,
                            maxLines: 3,
                            decoration: const InputDecoration(
                              hintText: 'Lleve tu tobos nuevos, traigan agua…',
                              prefixIcon: Icon(Icons.notes),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                    child: SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _submitting ? null : _submit,
                        child: _submitting
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Text(
                                'Publicar partido',
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.w900,
                                    ),
                              ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

}

String? _slotUnavailableTooltip(_AvailabilitySlot slot) {
  return switch (slot.reason) {
    'INCOMPATIBLE_VACANT_HOUR' =>
      'Horario publicado para otra categoría',
    'OUT_OF_RANGE' => 'Fuera del horario de la sede',
    'OCCUPIED_RESERVATION' => 'Reserva confirmada',
    'OCCUPIED_MATCH' => 'Ocupado',
    _ => 'Ocupado',
  };
}

final class _AvailabilitySlot {
  const _AvailabilitySlot({
    required this.scheduledAtUtc,
    required this.isAvailable,
    this.reason,
  });

  final DateTime scheduledAtUtc;
  final bool isAvailable;
  final String? reason;
}

String _formatDateShort(DateTime d) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final date = DateTime(d.year, d.month, d.day);
  if (date == today) return 'Hoy';
  return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';
}

final class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child, this.footer});

  final String title;
  final Widget child;
  final String? footer;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: scheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 10),
          child,
          if (footer != null) ...[
            const SizedBox(height: 10),
            Text(
              footer!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ],
      ),
    );
  }
}

final class _CompactButton extends StatelessWidget {
  const _CompactButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: scheme.onSurfaceVariant),
            const SizedBox(width: 8),
            Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

