import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import 'widgets/dynamic_format_parameters_form.dart';
import '../../../core/failures/app_failure.dart';
import '../../../core/formatting/fx_price_labels.dart';
import '../../../core/formatting/money_conversion.dart';
import '../../../core/models/currency_code.dart';
import '../../../core/theme/app_icons.dart';
import '../../../router/routes.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/data/models/category_dto.dart';
import '../../catalog/data/models/sport_dto.dart';
import '../../venues/data/models/venue_dto.dart';
import '../../venues/data/venues_repository.dart';
import '../../venues/presentation/widgets/venue_explorer_sheet.dart';
import '../data/models/create_tournament_request.dart';
import '../data/models/format_parameter_field_def.dart';
import '../data/models/tournament_preset_dto.dart';
import 'cubit/create_tournament_cubit.dart';
import 'cubit/create_tournament_state.dart';
import 'cubit/tournament_presets_cubit.dart';
import 'cubit/tournament_presets_state.dart';
import '../../../shared/widgets/count_stepper.dart';
import '../../../shared/widgets/date_strip.dart';
import '../../../shared/widgets/dual_price.dart';
import '../../../shared/widgets/pill_toggle.dart';
import '../../../shared/widgets/selectable_chip.dart';
import '../../../shared/widgets/segmented_control.dart';

/// Values the parameters form starts with. Use explicit API defaults first,
/// otherwise the schema's supported control default (boolean false, integer
/// minimum or 1, enum unset), matching the create-form contract.
Map<String, Object?> _initialParameterValues(TournamentPresetDto? preset) {
  final defaults = preset?.defaultParameters;
  final presetDefaults = defaults is Map ? defaults : const {};
  return {
    for (final field in preset?.parametersSchema ?? const [])
      field.key: presetDefaults[field.key] ?? field.defaultValue,
  };
}

final class CreateTournamentScreen extends StatefulWidget {
  const CreateTournamentScreen({super.key, this.now});

  @visibleForTesting
  final DateTime? now;

  @override
  State<CreateTournamentScreen> createState() => _CreateTournamentScreenState();
}

class _CreateTournamentScreenState extends State<CreateTournamentScreen> {
  final _nameController = TextEditingController();
  final _registrationPriceController = TextEditingController();

  late final CreateTournamentCubit _createTournamentCubit;
  late final TournamentPresetsCubit _tournamentPresetsCubit;

  List<SportDto> _sports = const [];
  String? _selectedSportId;
  List<CategoryDto> _categories = const [];
  String? _selectedCategoryId;
  List<VenueDto> _venues = const [];
  List<ExchangeRateRow> _exchangeRates = const [];
  String? _selectedVenueId;
  TournamentPresetDto? _selectedPreset;
  Map<String, Object?> _formatParameterValues = {};
  bool _publishOnCreate = false;
  String _visibility = 'PUBLIC';
  int? _maxSlots = 16;
  bool _hasCapacity = true;
  bool _hasEndDate = false;
  bool _chargeRegistration = true;
  bool _pairedRegistration = false;
  String? _gender;
  late final DateTime _now;
  late final List<DateStripDay> _days;
  late String _selectedDateKey;
  String? _selectedEndDateKey;

  bool _isLoadingSports = false;
  String? _sportsError;
  String? _submitError;
  bool _nameFieldTouched = false;

  List<VenueDto> get _venuesForSport {
    final sport = _sports
        .where((item) => item.id == _selectedSportId)
        .firstOrNull;
    if (sport == null) return _venues;
    final accepted = {
      sport.id.toLowerCase(),
      sport.code.toLowerCase(),
      sport.name.toLowerCase(),
    };
    return _venues.where((venue) {
      // Empty sports is a legacy-compatible venue: it remains selectable.
      return venue.sports.isEmpty ||
          venue.sports.any((value) => accepted.contains(value.toLowerCase()));
    }).toList();
  }

  int? get _parsedRegistrationPrice =>
      int.tryParse(_registrationPriceController.text.trim());

  /// Categorías del deporte actualmente seleccionado (cada categoría
  /// pertenece a un único deporte según `sportId`).
  List<CategoryDto> get _categoriesForSport =>
      _categories.where((c) => c.sportId == _selectedSportId).toList();

  String get _selectedVenueName =>
      _venuesForSport
          .where((venue) => venue.id == _selectedVenueId)
          .firstOrNull
          ?.name ??
      'Elegí sede';

  Future<void> _selectVenue() async {
    final selectedVenueId = await VenueExplorerSheet.show(
      context,
      venues: _venuesForSport,
      selectedVenueId: _selectedVenueId,
    );

    if (selectedVenueId != null && mounted) {
      setState(() => _selectedVenueId = selectedVenueId);
    }
  }

  String get _selectedCategoryName =>
      _categoriesForSport
          .where((category) => category.id == _selectedCategoryId)
          .firstOrNull
          ?.name ??
      'categoría pendiente';

  String? get _genderLabel => switch (_gender) {
    'FEMALE' => 'Femenino',
    'MIXED' => 'Mixto',
    'MALE' => 'Masculino',
    _ => null,
  };

  @override
  void initState() {
    super.initState();
    _now = widget.now ?? DateTime.now();
    _registrationPriceController.text = '15';
    _days = buildDateStripDays(28, from: _now);
    _selectedDateKey = _days[5].key;
    _createTournamentCubit = getIt<CreateTournamentCubit>();
    _tournamentPresetsCubit = getIt<TournamentPresetsCubit>();
    _loadSports();
    _loadExchangeRates();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _registrationPriceController.dispose();
    _createTournamentCubit.close();
    _tournamentPresetsCubit.close();
    super.dispose();
  }

  Future<void> _loadSports() async {
    setState(() {
      _isLoadingSports = true;
      _sportsError = null;
    });
    try {
      final sports = await getIt<CatalogRepository>().listSports();
      final categories = await getIt<CatalogRepository>().listCategories();
      final venues = await getIt<VenuesRepository>().listVenues();
      if (mounted) {
        setState(() {
          _sports = sports;
          _selectedSportId = sports.isEmpty ? null : sports.first.id;
          _categories = categories;
          _venues = venues;
          //? Solo se ofrecen las categorías del deporte seleccionado (evita
          //? duplicados al mezclar categorías de todos los deportes).
          _selectedCategoryId = _categoriesForSport.isEmpty
              ? null
              : _categoriesForSport.first.id;
        });
        final sportId = _selectedSportId;
        if (sportId != null) {
          _tournamentPresetsCubit.load(sportId: sportId);
        }
      }
    } catch (e) {
      final message = e is AppFailure
          ? e.message
          : 'No se pudieron cargar los deportes.';
      if (mounted) {
        setState(() => _sportsError = message);
      }
    } finally {
      if (mounted) {
        setState(() => _isLoadingSports = false);
      }
    }
  }

  Future<void> _loadExchangeRates() async {
    final rates = await loadExchangeRatesSafelySV();
    if (mounted) setState(() => _exchangeRates = rates);
  }

  String? get _registrationPriceBs {
    final price = _parsedRegistrationPrice;
    if (price == null || price <= 0 || _exchangeRates.isEmpty) return null;
    return secondaryBsLabelSV(
      primaryMinor: price * 100,
      primaryCurrency: CurrencyCode.usd,
      rates: _exchangeRates,
      effectiveDateIso: localCalendarDateIsoSV(_now),
    );
  }

  void _onSelectSport(String sportId) {
    setState(() {
      _selectedSportId = sportId;
      _selectedPreset = null;
      _formatParameterValues = {};
      _submitError = null;
      //? Al cambiar de deporte se resetea la categoría a la primera del nuevo
      //? deporte (la anterior puede no pertenecerle).
      _selectedCategoryId = _categoriesForSport.isEmpty
          ? null
          : _categoriesForSport.first.id;
      if (!_venuesForSport.any((venue) => venue.id == _selectedVenueId)) {
        _selectedVenueId = null;
      }
    });
    _tournamentPresetsCubit.load(sportId: sportId);
  }

  //? Validación y construcción de request. Retorna (request, error).
  //? Extraído para ser testeable y reutilizable.
  ({CreateTournamentRequest? request, String? error}) _buildCreateRequest() {
    //? 1. Validar nombre
    final name = _nameController.text.trim();
    if (name.length < 3) {
      return (
        request: null,
        error: 'El nombre debe tener al menos 3 caracteres.',
      );
    }

    //? 2. Validar deporte, categoría, preset
    final sportId = _selectedSportId;
    final categoryId = _selectedCategoryId;
    final preset = _selectedPreset;

    if (sportId == null || sportId.isEmpty) {
      return (request: null, error: 'Selecciona un deporte.');
    }
    if (categoryId == null || categoryId.isEmpty) {
      return (request: null, error: 'Selecciona una categoría.');
    }
    if (preset == null || preset.id.isEmpty) {
      return (request: null, error: 'Selecciona un formato de torneo.');
    }
    final endDateKey = _hasEndDate ? _selectedEndDateKey : null;
    if (endDateKey != null && endDateKey.compareTo(_selectedDateKey) < 0) {
      return (
        request: null,
        error: 'La fecha de fin no puede ser anterior al inicio.',
      );
    }

    final schemaError = _formatSchemaError(preset);
    if (schemaError != null) {
      return (request: null, error: schemaError);
    }
    final priceText = _registrationPriceController.text.trim();
    final price = _parsedRegistrationPrice;
    if (_chargeRegistration &&
        (priceText.isEmpty || price == null || price < 0)) {
      return (request: null, error: 'Ingresá un precio válido o dejalo vacío.');
    }

    //? 4. Retornar request válido (parámetros ya listos en _formatParameterValues)
    return (
      request: CreateTournamentRequest(
        sportId: sportId,
        categoryId: categoryId,
        name: name,
        formatPresetId: preset.id,
        formatParameters: _formatParameterValues.isNotEmpty
            ? {
                for (final field in preset.parametersSchema ?? const [])
                  if (_formatParameterValues.containsKey(field.key))
                    field.key: _formatParameterValues[field.key],
              }
            : null,
        startsAt: DateTime.parse(_selectedDateKey),
        endsAt: endDateKey == null ? null : DateTime.parse(endDateKey),
        venueId: _selectedVenueId,
        gender: _gender,
        pairedRegistration: _pairedRegistration,
        inscriptionPrice: _chargeRegistration ? price : null,
        maxSlots: _maxSlots,
        publishOnCreate: _publishOnCreate,
        visibility: _visibility,
      ),
      error: null,
    );
  }

  String? _formatSchemaError(TournamentPresetDto preset) {
    final fields = preset.parametersSchema ?? const [];
    for (final field in fields) {
      final value = _formatParameterValues[field.key];
      if (value == null) {
        if (field.required == true) {
          return 'El campo "${field.label}" es requerido.';
        }
        continue;
      }
      if (field is BooleanFieldDef && value is! bool) {
        return 'El campo "${field.label}" debe ser sí o no.';
      }
      if (field is IntFieldDef) {
        if (value is! int ||
            (field.min != null && value < field.min!) ||
            (field.max != null && value > field.max!)) {
          return 'Revisá el valor de "${field.label}".';
        }
      }
      if (field is EnumFieldDef &&
          (value is! String ||
              !field.options.any((option) => option.value == value))) {
        return 'Elegí una opción válida para "${field.label}".';
      }
    }
    return null;
  }

  void _onSubmit() {
    final (:request, :error) = _buildCreateRequest();
    if (error != null) {
      setState(() => _submitError = error);
      return;
    }
    setState(() => _submitError = null);
    _createTournamentCubit.submit(request!);
  }

  //? Helper: validar mínimo requerido para habilitar submit
  bool get _canSubmit {
    if (_nameController.text.trim().isEmpty ||
        _selectedSportId == null ||
        _selectedCategoryId == null ||
        _selectedPreset == null) {
      return false;
    }
    if (_nameController.text.trim().length < 3 ||
        _formatSchemaError(_selectedPreset!) != null) {
      return false;
    }
    if (_hasEndDate &&
        _selectedEndDateKey != null &&
        _selectedEndDateKey!.compareTo(_selectedDateKey) < 0) {
      return false;
    }
    final priceText = _registrationPriceController.text.trim();
    if (_chargeRegistration &&
        priceText.isNotEmpty &&
        (_parsedRegistrationPrice == null || _parsedRegistrationPrice! < 0)) {
      return false;
    }
    if (_chargeRegistration && priceText.isEmpty) return false;

    return true;
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return MultiBlocProvider(
      providers: [
        BlocProvider.value(value: _createTournamentCubit),
        BlocProvider.value(value: _tournamentPresetsCubit),
      ],
      child: BlocListener<CreateTournamentCubit, CreateTournamentState>(
        listener: (context, state) {
          if (state is CreateTournamentSuccess) {
            context.go(Routes.tournamentDetail(state.tournamentId));
          }
        },
        child: Scaffold(
          key: const Key('tournaments.create'),
          appBar: AppBar(
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Crear torneo'),
                Text(
                  _publishOnCreate
                      ? 'Se crea y se abre la inscripción'
                      : 'Se crea en borrador: nadie lo ve todavía',
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            children: [
              //? Error banner sticky en top si hay error
              if (_submitError != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: scheme.errorContainer.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: scheme.error.withValues(alpha: 0.35),
                      ),
                    ),
                    child: Text(
                      _submitError!,
                      style: TextStyle(
                        color: scheme.error,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              Text(
                'Nombre',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              TextField(
                key: const Key('create.tournament.name'),
                controller: _nameController,
                textInputAction: TextInputAction.next,
                onChanged: (_) => setState(() {
                  _nameFieldTouched = true;
                }), //? Rebuild para update _canSubmit
                decoration: InputDecoration(
                  hintText: 'Ej: Torneo de Otoño',
                  border: OutlineInputBorder(
                    borderSide: BorderSide(
                      color: _nameFieldTouched && _nameController.text.isEmpty
                          ? scheme.error
                          : scheme.outline,
                    ),
                  ),
                  errorText: _nameFieldTouched && _nameController.text.isEmpty
                      ? 'Requerido'
                      : null,
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'Cuándo',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              DateStrip(
                key: const Key('create.tournament.startDateStrip'),
                days: _days,
                value: _selectedDateKey,
                horizontalPadding: 0,
                onChanged: (value) => setState(() => _selectedDateKey = value),
              ),
              SwitchListTile.adaptive(
                key: const Key('create.tournament.includeEndDate'),
                contentPadding: EdgeInsets.zero,
                title: const Text('Dura más de un día'),
                subtitle: Text(
                  _hasEndDate ? 'Elegí cuándo termina' : 'Termina el mismo día',
                ),
                value: _hasEndDate,
                onChanged: (value) => setState(() {
                  _hasEndDate = value;
                  _selectedEndDateKey = value
                      ? (_selectedEndDateKey ?? _days[4].key)
                      : null;
                }),
              ),
              if (_hasEndDate) ...[
                DateStrip(
                  key: const Key('create.tournament.endDateStrip'),
                  days: _days,
                  value: _selectedEndDateKey,
                  horizontalPadding: 0,
                  onChanged: (value) =>
                      setState(() => _selectedEndDateKey = value),
                ),
                if (_selectedEndDateKey != null &&
                    _selectedEndDateKey!.compareTo(_selectedDateKey) < 0)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      'El fin no puede ser antes del inicio.',
                      key: Key('create.tournament.endDateError'),
                    ),
                  ),
              ],
              const SizedBox(height: 14),
              Text(
                'Deporte',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              if (_isLoadingSports)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(12),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (_sportsError != null)
                _ErrorBox(message: _sportsError!, onRetry: _loadSports)
              else if (_sports.isEmpty)
                _EmptyBox(message: 'No hay deportes disponibles.')
              else
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: _sports
                      .map(
                        (s) => SelectableChip(
                          selected: _selectedSportId == s.id,
                          onTap: () => _onSelectSport(s.id),
                          label: s.name,
                        ),
                      )
                      .toList(),
                ),
              const SizedBox(height: 14),
              Text(
                'Dónde',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              if (_isLoadingSports)
                const Center(child: CircularProgressIndicator())
              else if (_venuesForSport.isEmpty)
                const _EmptyBox(
                  message: 'No hay sedes disponibles para este deporte.',
                )
              else
                InkWell(
                  key: const Key('create.tournament.venue'),
                  borderRadius: BorderRadius.circular(12),
                  onTap: _selectVenue,
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      prefixIcon: Icon(AppIcons.pin),
                      suffixIcon: Icon(AppIcons.chevronDown),
                    ),
                    isEmpty: _selectedVenueId == null,
                    child: Text(
                      _selectedVenueId == null
                          ? 'Seleccioná una sede'
                          : _selectedVenueName,
                    ),
                  ),
                ),
              const SizedBox(height: 14),
              Text(
                'Género (opcional)',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              SegmentedControl<String?>(
                value: _gender,
                onChanged: (value) =>
                    setState(() => _gender = _gender == value ? null : value),
                options: const [
                  SegmentedOption(value: 'MALE', label: 'Masculino'),
                  SegmentedOption(value: 'FEMALE', label: 'Femenino'),
                  SegmentedOption(value: 'MIXED', label: 'Mixto'),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Limitar cupos',
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _hasCapacity
                              ? 'Hasta ${_maxSlots ?? 16} inscripciones'
                              : 'Sin tope',
                          style: TextStyle(color: scheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                  Switch.adaptive(
                    key: const Key('create.tournament.hasCapacity'),
                    value: _hasCapacity,
                    onChanged: (value) => setState(() {
                      _hasCapacity = value;
                      _maxSlots = value ? (_maxSlots ?? 16) : null;
                    }),
                  ),
                ],
              ),
              if (_hasCapacity) ...[
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: CountStepper(
                    value: _maxSlots ?? 16,
                    min: 2,
                    max: 64,
                    onChanged: (value) => setState(() => _maxSlots = value),
                  ),
                ),
              ] else ...[
                Text(
                  'Sin cupo máximo',
                  style: TextStyle(color: scheme.onSurfaceVariant),
                ),
              ],
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Precio de inscripción',
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(height: 4),
                        DualPrice(
                          primaryLabel: !_chargeRegistration
                              ? 'Sin precio'
                              : _parsedRegistrationPrice == null
                              ? 'Sin definir'
                              : _parsedRegistrationPrice == 0
                              ? 'Gratis'
                              : 'US\$$_parsedRegistrationPrice',
                          secondaryLabel:
                              !_chargeRegistration ||
                                  _parsedRegistrationPrice == null ||
                                  _parsedRegistrationPrice == 0
                              ? null
                              : _registrationPriceBs,
                          alignEnd: false,
                        ),
                      ],
                    ),
                  ),
                  Switch.adaptive(
                    key: const Key('create.tournament.chargeRegistration'),
                    value: _chargeRegistration,
                    onChanged: (value) =>
                        setState(() => _chargeRegistration = value),
                  ),
                ],
              ),
              if (_chargeRegistration)
                Align(
                  alignment: Alignment.centerRight,
                  child: SizedBox(
                    width: 128,
                    child: TextField(
                      key: const Key('create.tournament.inscriptionPrice'),
                      controller: _registrationPriceController,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: false,
                      ),
                      textAlign: TextAlign.center,
                      decoration: const InputDecoration(
                        prefixText: 'US\$ ',
                        hintText: '0',
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                ),
              const SizedBox(height: 14),
              Text(
                'Visibilidad y estado',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              SegmentedControl<String>(
                key: const Key('create.tournament.visibility'),
                value: _visibility,
                onChanged: (value) => setState(() => _visibility = value),
                options: const [
                  SegmentedOption(value: 'PUBLIC', label: 'Público'),
                  SegmentedOption(value: 'PRIVATE', label: 'Sólo invitados'),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                'Modalidad',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              SegmentedControl<bool>(
                value: _pairedRegistration,
                onChanged: (value) =>
                    setState(() => _pairedRegistration = value),
                options: const [
                  SegmentedOption(value: false, label: 'Singles'),
                  SegmentedOption(value: true, label: 'Duplas'),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                'Categoría',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              if (_categoriesForSport.isEmpty)
                _EmptyBox(
                  message: 'No hay categorías disponibles para este deporte.',
                )
              else
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: _categoriesForSport
                      .map(
                        (c) => ChoiceChip(
                          selected: _selectedCategoryId == c.id,
                          onSelected: (_) =>
                              setState(() => _selectedCategoryId = c.id),
                          label: Text(c.name),
                        ),
                      )
                      .toList(),
                ),
              const SizedBox(height: 14),
              Text(
                'Formato del torneo',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              BlocBuilder<TournamentPresetsCubit, TournamentPresetsState>(
                builder: (context, state) {
                  return switch (state) {
                    TournamentPresetsInitial() => _EmptyBox(
                      message: _selectedSportId == null
                          ? 'Selecciona un deporte para ver formatos.'
                          : 'Cargando formatos...',
                    ),
                    TournamentPresetsLoading() => const Center(
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: CircularProgressIndicator(),
                      ),
                    ),
                    TournamentPresetsEmpty() => _EmptyBox(
                      message: 'No hay formatos disponibles para este deporte.',
                    ),
                    TournamentPresetsError(:final message) => _ErrorBox(
                      message: message,
                      onRetry: () {
                        final sportId = _selectedSportId;
                        if (sportId != null) {
                          context.read<TournamentPresetsCubit>().load(
                            sportId: sportId,
                          );
                        }
                      },
                    ),
                    TournamentPresetsSuccess(:final presets) => Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              for (final preset in presets)
                                Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: SelectableChip(
                                    label: preset.name,
                                    selected: _selectedPreset?.id == preset.id,
                                    onTap: () => setState(() {
                                      _selectedPreset = preset;
                                      _formatParameterValues =
                                          _initialParameterValues(preset);
                                    }),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        //? Los parámetros los define el schema del preset.
                        if (_selectedPreset?.parametersSchema?.isNotEmpty ??
                            false) ...[
                          const SizedBox(height: 6),
                          DynamicFormatParametersForm(
                            fields: _selectedPreset!.parametersSchema!,
                            values: _formatParameterValues,
                            onChanged: (key, value) => setState(
                              () => _formatParameterValues[key] = value,
                            ),
                          ),
                        ],
                      ],
                    ),
                  };
                },
              ),
              const SizedBox(height: 14),
              Text(
                'Publicación',
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Publicar al crear',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _publishOnCreate
                                  ? 'Queda Abierta: los jugadores se pueden anotar'
                                  : 'Queda en Borrador: la abrís después',
                              style: TextStyle(color: scheme.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ),
                      PillToggle(
                        value: _publishOnCreate,
                        onChanged: (value) =>
                            setState(() => _publishOnCreate = value),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          bottomNavigationBar:
              BlocBuilder<CreateTournamentCubit, CreateTournamentState>(
                builder: (context, state) {
                  final isSubmitting = state is CreateTournamentSubmitting;
                  final publishNeedsRetry =
                      state is CreateTournamentPublishError;
                  final ready =
                      _canSubmit && !isSubmitting && !publishNeedsRetry;
                  return Container(
                    decoration: BoxDecoration(
                      color: scheme.surfaceContainerLow,
                      border: Border(
                        top: BorderSide(color: scheme.outlineVariant),
                      ),
                    ),
                    padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
                    child: SafeArea(
                      top: false,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  [
                                    '${_sports.firstWhere(
                                      (sport) => sport.id == _selectedSportId,
                                      orElse: () => const SportDto(id: '', code: '', name: ''),
                                    ).name} $_selectedCategoryName${_genderLabel == null ? '' : ' $_genderLabel'}',
                                    _selectedPreset?.name ?? 'sin formato',
                                  ].join(' · '),
                                  style: TextStyle(
                                    color: scheme.onSurfaceVariant,
                                    fontSize: 12.5,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Text(
                                !_chargeRegistration
                                    ? 'Sin precio'
                                    : _parsedRegistrationPrice == null
                                    ? 'Sin definir'
                                    : _parsedRegistrationPrice == 0
                                    ? 'Gratis'
                                    : 'US\$$_parsedRegistrationPrice',
                                style: TextStyle(
                                  color: scheme.onSurface,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 12.5,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          FilledButton.icon(
                            onPressed: ready ? _onSubmit : null,
                            icon: isSubmitting
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(AppIcons.check),
                            label: Text(
                              isSubmitting
                                  ? 'Creando...'
                                  : _nameController.text.trim().length < 3
                                  ? 'Ponele nombre al torneo'
                                  : _selectedPreset == null
                                  ? 'Elegí un formato'
                                  : _formatSchemaError(_selectedPreset!) != null
                                  ? 'Completá el formato'
                                  : _hasEndDate &&
                                        _selectedEndDateKey != null &&
                                        _selectedEndDateKey!.compareTo(
                                              _selectedDateKey,
                                            ) <
                                            0
                                  ? 'Revisá las fechas'
                                  : _publishOnCreate
                                  ? 'Crear y abrir inscripción'
                                  : 'Crear borrador',
                            ),
                          ),
                          if (state is CreateTournamentError ||
                              state is CreateTournamentPublishError)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                state is CreateTournamentError
                                    ? state.message
                                    : (state as CreateTournamentPublishError)
                                          .message,
                                style: TextStyle(
                                  color: scheme.error,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          if (publishNeedsRetry) ...[
                            const SizedBox(height: 8),
                            OutlinedButton.icon(
                              key: const Key('create.tournament.retryPublish'),
                              onPressed: () => context
                                  .read<CreateTournamentCubit>()
                                  .retryPublish(),
                              icon: const Icon(AppIcons.refresh),
                              label: const Text('Reintentar publicación'),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
        ),
      ),
    );
  }
}

final class _EmptyBox extends StatelessWidget {
  const _EmptyBox({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: SelectableText.rich(
        TextSpan(
          text: message,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: scheme.onSurfaceVariant,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

final class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.errorContainer.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.error.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SelectableText.rich(
            TextSpan(
              text: message,
              style: TextStyle(
                color: scheme.error,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(AppIcons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }
}
