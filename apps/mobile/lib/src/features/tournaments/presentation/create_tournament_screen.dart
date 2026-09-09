import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/failures/app_failure.dart';
import '../../../core/theme/app_icons.dart';
import '../../../router/routes.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/data/models/category_dto.dart';
import '../../catalog/data/models/sport_dto.dart';
import '../data/models/create_tournament_request.dart';
import '../data/models/tournament_preset_dto.dart';
import 'cubit/create_tournament_cubit.dart';
import 'cubit/create_tournament_state.dart';
import 'cubit/tournament_presets_cubit.dart';
import 'cubit/tournament_presets_state.dart';

extension on Iterable<TournamentPresetDto> {
  TournamentPresetDto? get firstOrNull => isEmpty ? null : first;
}

/// Descripción amigable de un preset de formato (para el usuario final).
String _presetDescription(String code) {
  switch (code) {
    case 'ROUND_ROBIN':
      return 'Todos contra todos';
    case 'AMERICANO':
      return 'Rotación por rondas en varias canchas';
    case 'SINGLE_ELIMINATION':
      return 'Eliminación directa por llaves';
    default:
      return 'Formato de torneo';
  }
}

final class CreateTournamentScreen extends StatefulWidget {
  const CreateTournamentScreen({super.key});

  @override
  State<CreateTournamentScreen> createState() => _CreateTournamentScreenState();
}

class _CreateTournamentScreenState extends State<CreateTournamentScreen> {
  final _nameController = TextEditingController();

  late final CreateTournamentCubit _createTournamentCubit;
  late final TournamentPresetsCubit _tournamentPresetsCubit;

  List<SportDto> _sports = const [];
  String? _selectedSportId;
  List<CategoryDto> _categories = const [];
  String? _selectedCategoryId;
  TournamentPresetDto? _selectedPreset;
  Map<String, Object?> _formatParameterValues = {};
  String _visibility = 'PUBLIC';

  bool _isLoadingSports = false;
  String? _sportsError;
  String? _submitError;
  bool _nameFieldTouched = false;

  /// Categorías del deporte actualmente seleccionado (cada categoría
  /// pertenece a un único deporte según `sportId`).
  List<CategoryDto> get _categoriesForSport =>
      _categories.where((c) => c.sportId == _selectedSportId).toList();

  @override
  void initState() {
    super.initState();
    _createTournamentCubit = getIt<CreateTournamentCubit>();
    _tournamentPresetsCubit = getIt<TournamentPresetsCubit>();
    _loadSports();
  }

  @override
  void dispose() {
    _nameController.dispose();
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
      if (mounted) {
        setState(() {
          _sports = sports;
          _selectedSportId = sports.isEmpty ? null : sports.first.id;
          _categories = categories;
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
    });
    _tournamentPresetsCubit.load(sportId: sportId);
  }

  //? Validación y construcción de request. Retorna (request, error).
  //? Extraído para ser testeable y reutilizable.
  ({CreateTournamentRequest? request, String? error}) _buildCreateRequest() {
    //? 1. Validar nombre
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      return (request: null, error: 'Ingresá un nombre para el torneo.');
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

    //? 3. Validar campos requeridos del schema
    if (preset.parametersSchema != null) {
      for (final field in preset.parametersSchema!) {
        if (field.required == true && (_formatParameterValues[field.key] == null)) {
          return (request: null, error: 'El campo "${field.label}" es requerido.');
        }
      }
    }

    //? 4. Retornar request válido (parámetros ya listos en _formatParameterValues)
    return (
      request: CreateTournamentRequest(
        sportId: sportId,
        categoryId: categoryId,
        name: name,
        formatPresetId: preset.id,
        formatParameters: _formatParameterValues.isNotEmpty ? _formatParameterValues : null,
        visibility: _visibility,
      ),
      error: null,
    );
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

    //? Validar campos requeridos del schema
    final preset = _selectedPreset;
    if (preset?.parametersSchema != null) {
      for (final field in preset!.parametersSchema!) {
        if (field.required == true && _formatParameterValues[field.key] == null) {
          return false;
        }
      }
    }

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
            title: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Crear torneo'),
                Text(
                  'Lo creás en borrador: nadie lo ve todavía',
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
              _CreateUnavailableField(
                title: 'Dónde',
                message:
                    'La sede se asigna después de crear el torneo. El API todavía no expone este campo.',
              ),
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
                        (s) => ChoiceChip(
                          selected: _selectedSportId == s.id,
                          onSelected: (_) => _onSelectSport(s.id),
                          label: Text(s.name),
                        ),
                      )
                      .toList(),
                ),
              //? Mostrar selector de singles/dobles solo si es tenis
              if (_isTenis) ...[
                const SizedBox(height: 14),
                Text(
                  'Categoría de juego',
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    ChoiceChip(
                      selected: _tennisFormat == 'SINGLES',
                      onSelected: (_) => setState(() => _tennisFormat = 'SINGLES'),
                      label: const Text('Singles'),
                    ),
                    ChoiceChip(
                      selected: _tennisFormat == 'DOUBLES',
                      onSelected: (_) => setState(() => _tennisFormat = 'DOUBLES'),
                      label: const Text('Dobles'),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 14),
              _CreateUnavailableField(
                title: 'Cupos',
                message:
                    'Se usan los cupos del formato actual hasta que el API exponga el límite configurable.',
              ),
              const SizedBox(height: 14),
              _CreateUnavailableField(
                title: 'Inscripción',
                message:
                    'El precio se define fuera de este formulario por ahora.',
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
                        RadioGroup<String>(
                          groupValue: _selectedPreset?.id,
                          onChanged: (id) {
                            final preset = presets
                                .where((p) => p.id == id)
                                .firstOrNull;
                            setState(() => _selectedPreset = preset);
                          },
                          child: Column(
                            children: [
                              for (final p in presets)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: RadioListTile<String>(
                                    value: p.id,
                                    title: Text(
                                      p.name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                    subtitle: Text(
                                      _presetDescription(p.code),
                                      style: TextStyle(
                                        color: scheme.onSurfaceVariant,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        if (_selectedPreset != null) ...[
                          const SizedBox(height: 6),
                          _PresetParametersCard(
                            preset: _selectedPreset!,
                            doubleRound: _doubleRound,
                            onToggleDoubleRound: (v) =>
                                setState(() => _doubleRound = v),
                            americanoRounds: _americanoRounds,
                            onChangeAmericanoRounds: (v) =>
                                setState(() => _americanoRounds = v),
                            americanoCourts: _americanoCourts,
                            onChangeAmericanoCourts: (v) =>
                                setState(() => _americanoCourts = v),
                            thirdPlaceMatch: _thirdPlaceMatch,
                            onToggleThirdPlaceMatch: (v) =>
                                setState(() => _thirdPlaceMatch = v),
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
                child: SwitchListTile(
                  value: _visibility == 'PUBLIC',
                  onChanged: (value) => setState(
                    () => _visibility = value ? 'PUBLIC' : 'PRIVATE',
                  ),
                  title: const Text(
                    'Publicar al crear',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(
                    _visibility == 'PUBLIC'
                        ? 'Aparece en el listado y se abre la inscripción.'
                        : 'Queda en borrador: cargás gente vos y publicás después.',
                  ),
                ),
              ),
            ],
          ),
          bottomNavigationBar:
              BlocBuilder<CreateTournamentCubit, CreateTournamentState>(
                builder: (context, state) {
                  final isSubmitting = state is CreateTournamentSubmitting;
                  final ready = _canSubmit && !isSubmitting;
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
                                  'Sede pendiente · ${_selectedCategoryId == null ? 'categoría pendiente' : 'categoría seleccionada'}',
                                  style: TextStyle(
                                    color: scheme.onSurfaceVariant,
                                    fontSize: 12.5,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Text(
                                'Precio por confirmar',
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
                                  : !_canSubmit &&
                                        _nameController.text.trim().isEmpty
                                  ? 'Ponele nombre al torneo'
                                  : _visibility == 'PUBLIC'
                                  ? 'Crear y publicar'
                                  : 'Crear borrador',
                            ),
                          ),
                          if (state is CreateTournamentError)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                state.message,
                                style: TextStyle(
                                  color: scheme.error,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
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

final class _CreateUnavailableField extends StatelessWidget {
  const _CreateUnavailableField({required this.title, required this.message});

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: scheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Text(
            message,
            style: TextStyle(
              color: scheme.onSurfaceVariant,
              fontSize: 12.5,
              height: 1.45,
            ),
          ),
        ),
      ],
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

final class _PresetParametersCard extends StatelessWidget {
  const _PresetParametersCard({
    required this.preset,
    required this.doubleRound,
    required this.onToggleDoubleRound,
    required this.americanoRounds,
    required this.onChangeAmericanoRounds,
    required this.americanoCourts,
    required this.onChangeAmericanoCourts,
    required this.thirdPlaceMatch,
    required this.onToggleThirdPlaceMatch,
  });

  final TournamentPresetDto preset;
  final bool doubleRound;
  final ValueChanged<bool> onToggleDoubleRound;
  final int americanoRounds;
  final ValueChanged<int> onChangeAmericanoRounds;
  final int americanoCourts;
  final ValueChanged<int> onChangeAmericanoCourts;
  final bool thirdPlaceMatch;
  final ValueChanged<bool> onToggleThirdPlaceMatch;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Parámetros',
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 10),
          if (preset.code == 'ROUND_ROBIN')
            SwitchListTile(
              value: doubleRound,
              onChanged: onToggleDoubleRound,
              title: const Text(
                'Doble vuelta',
                style: TextStyle(fontWeight: FontWeight.w900),
              ),
              subtitle: Text(
                doubleRound ? 'Ida y vuelta' : 'Una sola vuelta',
                style: TextStyle(
                  color: scheme.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
              ),
              contentPadding: EdgeInsets.zero,
            )
          else if (preset.code == 'AMERICANO') ...[
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Rondas',
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                _StepperTiny(
                  value: americanoRounds,
                  min: 1,
                  max: 50,
                  onChanged: onChangeAmericanoRounds,
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Canchas',
                    style: TextStyle(
                      color: scheme.onSurfaceVariant,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                _StepperTiny(
                  value: americanoCourts,
                  min: 1,
                  max: 20,
                  onChanged: onChangeAmericanoCourts,
                ),
              ],
            ),
          ] else if (preset.code == 'SINGLE_ELIMINATION')
            SwitchListTile(
              value: thirdPlaceMatch,
              onChanged: onToggleThirdPlaceMatch,
              title: const Text(
                'Partido por el 3er puesto',
                style: TextStyle(fontWeight: FontWeight.w900),
              ),
              subtitle: Text(
                thirdPlaceMatch
                    ? 'Incluye partido por el 3er lugar'
                    : 'Solo bracket principal',
                style: TextStyle(
                  color: scheme.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
              ),
              contentPadding: EdgeInsets.zero,
            )
          else
            Text(
              'Este formato no requiere parámetros en el MVP.',
              style: TextStyle(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
              ),
            ),
        ],
      ),
    );
  }
}

final class _StepperTiny extends StatelessWidget {
  const _StepperTiny({
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
  });

  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final canDec = value > min;
    final canInc = value < max;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          visualDensity: VisualDensity.compact,
          onPressed: canDec ? () => onChanged(value - 1) : null,
          icon: const Icon(AppIcons.removeCircle),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Text(
            '$value',
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
        ),
        IconButton(
          visualDensity: VisualDensity.compact,
          onPressed: canInc ? () => onChanged(value + 1) : null,
          icon: const Icon(AppIcons.addCircle),
        ),
      ],
    );
  }
}
