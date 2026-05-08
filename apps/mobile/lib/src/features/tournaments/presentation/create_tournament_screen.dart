import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/failures/app_failure.dart';
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
  bool _doubleRound = false;
  int _americanoRounds = 3;
  int _americanoCourts = 1;
  bool _thirdPlaceMatch = false;

  bool _isLoadingSports = false;
  String? _sportsError;
  String? _submitError;

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
          _selectedCategoryId = categories.isEmpty ? null : categories.first.id;
        });
        final sportId = _selectedSportId;
        if (sportId != null) {
          _tournamentPresetsCubit.load(sportId: sportId);
        }
      }
    } catch (e) {
      final message = e is AppFailure ? e.message : 'No se pudieron cargar los deportes.';
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
      _doubleRound = false;
      _americanoRounds = 3;
      _americanoCourts = 1;
      _thirdPlaceMatch = false;
      _submitError = null;
    });
    _tournamentPresetsCubit.load(sportId: sportId);
  }

  void _onSubmit() {
    final sportId = _selectedSportId;
    final categoryId = _selectedCategoryId;
    final preset = _selectedPreset;
    if (sportId == null || sportId.isEmpty) {
      setState(() => _submitError = 'Selecciona un deporte.');
      return;
    }
    if (categoryId == null || categoryId.isEmpty) {
      setState(() => _submitError = 'Selecciona una categoría.');
      return;
    }
    if (preset == null || preset.id.isEmpty) {
      setState(() => _submitError = 'Selecciona un preset.');
      return;
    }
    setState(() => _submitError = null);

    Map<String, Object?>? params;
    if (preset.code == 'ROUND_ROBIN') {
      params = {'doubleRound': _doubleRound};
    } else if (preset.code == 'AMERICANO') {
      params = {'rounds': _americanoRounds, 'courts': _americanoCourts};
    } else if (preset.code == 'SINGLE_ELIMINATION') {
      params = {'thirdPlaceMatch': _thirdPlaceMatch};
    }

    _createTournamentCubit.submit(
          CreateTournamentRequest(
            sportId: sportId,
            categoryId: categoryId,
            name: _nameController.text,
            formatPresetId: preset.id,
            formatParameters: params,
          ),
        );
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
          appBar: AppBar(title: const Text('Crear torneo')),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
            children: [
              Text(
                'Nombre',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _nameController,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  hintText: 'Ej: Torneo de Otoño',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'Deporte',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 8),
              if (_isLoadingSports)
                const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator()))
              else if (_sportsError != null)
                _ErrorBox(
                  message: _sportsError!,
                  onRetry: _loadSports,
                )
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
              const SizedBox(height: 14),
              Text(
                'Categoría',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 8),
              if (_categories.isEmpty)
                _EmptyBox(message: 'No hay categorías disponibles.')
              else
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: _categories
                      .map(
                        (c) => ChoiceChip(
                          selected: _selectedCategoryId == c.id,
                          onSelected: (_) => setState(() => _selectedCategoryId = c.id),
                          label: Text(c.name),
                        ),
                      )
                      .toList(),
                ),
              const SizedBox(height: 14),
              Text(
                'Preset',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 8),
              BlocBuilder<TournamentPresetsCubit, TournamentPresetsState>(
                builder: (context, state) {
                  return switch (state) {
                    TournamentPresetsInitial() => _EmptyBox(
                        message: _selectedSportId == null
                            ? 'Selecciona un deporte para ver presets.'
                            : 'Cargando presets...',
                      ),
                    TournamentPresetsLoading() => const Center(
                        child: Padding(
                          padding: EdgeInsets.all(12),
                          child: CircularProgressIndicator(),
                        ),
                      ),
                    TournamentPresetsEmpty() => _EmptyBox(
                        message: 'No hay presets para este deporte.',
                      ),
                    TournamentPresetsError(:final message) => _ErrorBox(
                        message: message,
                        onRetry: () {
                          final sportId = _selectedSportId;
                          if (sportId != null) {
                            context.read<TournamentPresetsCubit>().load(sportId: sportId);
                          }
                        },
                      ),
                    TournamentPresetsSuccess(:final presets) => Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          RadioGroup<String>(
                            groupValue: _selectedPreset?.id,
                            onChanged: (id) {
                              final preset = presets.where((p) => p.id == id).firstOrNull;
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
                                        style: const TextStyle(fontWeight: FontWeight.w900),
                                      ),
                                      subtitle: Text(
                                        '${p.code} · v${p.version}',
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
                              onToggleDoubleRound: (v) => setState(() => _doubleRound = v),
                              americanoRounds: _americanoRounds,
                              onChangeAmericanoRounds: (v) => setState(() => _americanoRounds = v),
                              americanoCourts: _americanoCourts,
                              onChangeAmericanoCourts: (v) => setState(() => _americanoCourts = v),
                              thirdPlaceMatch: _thirdPlaceMatch,
                              onToggleThirdPlaceMatch: (v) => setState(() => _thirdPlaceMatch = v),
                            ),
                          ],
                        ],
                      ),
                  };
                },
              ),
              const SizedBox(height: 14),
              BlocBuilder<CreateTournamentCubit, CreateTournamentState>(
                builder: (context, state) {
                  final isSubmitting = state is CreateTournamentSubmitting;
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      FilledButton.icon(
                        onPressed: isSubmitting ? null : _onSubmit,
                        icon: isSubmitting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.check),
                        label: Text(isSubmitting ? 'Creando...' : 'Crear torneo'),
                      ),
                      const SizedBox(height: 12),
                      if (_submitError != null)
                        SelectableText.rich(
                          TextSpan(
                            text: _submitError!,
                            style: TextStyle(
                              color: scheme.error,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      if (state is CreateTournamentError) ...[
                        if (_submitError != null) const SizedBox(height: 8),
                        SelectableText.rich(
                          TextSpan(
                            text: state.message,
                            style: TextStyle(
                              color: scheme.error,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ],
                  );
                },
              ),
            ],
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
            icon: const Icon(Icons.refresh),
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
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
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
                thirdPlaceMatch ? 'Incluye partido por el 3er lugar' : 'Solo bracket principal',
                style: TextStyle(
                  color: scheme.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
              ),
              contentPadding: EdgeInsets.zero,
            )
          else
            Text(
              'Este preset no requiere parámetros en el MVP.',
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
          icon: const Icon(Icons.remove_circle_outline),
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
          icon: const Icon(Icons.add_circle_outline),
        ),
      ],
    );
  }
}

