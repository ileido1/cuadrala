import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/failures/app_failure.dart';
import '../../../router/routes.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/data/models/sport_dto.dart';
import '../data/models/create_tournament_request.dart';
import 'cubit/create_tournament_cubit.dart';
import 'cubit/create_tournament_state.dart';
import 'cubit/tournament_presets_cubit.dart';
import 'cubit/tournament_presets_state.dart';

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
  int? _selectedBracketSize;

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
      if (mounted) {
        setState(() {
          _sports = sports;
          _selectedSportId = sports.isEmpty ? null : sports.first.id;
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
      _selectedBracketSize = null;
      _submitError = null;
    });
    _tournamentPresetsCubit.load(sportId: sportId);
  }

  void _onSubmit() {
    final sportId = _selectedSportId;
    final bracket = _selectedBracketSize;
    if (sportId == null || sportId.isEmpty) {
      setState(() => _submitError = 'Selecciona un deporte.');
      return;
    }
    if (bracket == null || bracket <= 0) {
      setState(() => _submitError = 'Selecciona un formato/preset.');
      return;
    }
    setState(() => _submitError = null);
    _createTournamentCubit.submit(
          CreateTournamentRequest(
            sportId: sportId,
            name: _nameController.text,
            bracketSize: bracket,
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
                'Preset / bracket',
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
                    TournamentPresetsSuccess(:final presets) => RadioGroup<int>(
                        groupValue: _selectedBracketSize,
                        onChanged: (v) => setState(() => _selectedBracketSize = v),
                        child: Column(
                          children: presets
                              .map(
                                (p) => Padding(
                                  padding: const EdgeInsets.only(bottom: 10),
                                  child: RadioListTile<int>(
                                    value: p.suggestedBracketSize,
                                    title: Text(
                                      p.name,
                                      style: const TextStyle(fontWeight: FontWeight.w900),
                                    ),
                                    subtitle: Text(
                                      'Bracket sugerido: ${p.suggestedBracketSize}',
                                      style: TextStyle(
                                        color: scheme.onSurfaceVariant,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ),
                              )
                              .toList(),
                        ),
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

