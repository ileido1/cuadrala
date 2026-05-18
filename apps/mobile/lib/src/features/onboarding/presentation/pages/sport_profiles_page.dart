import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/di/service_locator.dart';
import '../../../../core/sport/sport_classification.dart';
import '../../../catalog/data/catalog_repository.dart';
import '../../../catalog/data/models/category_dto.dart';
import '../../../catalog/data/models/sport_dto.dart';
import '../../data/models/onboarding_status_dto.dart';
import '../../data/models/player_sport_profile_dto.dart';
import '../cubit/onboarding_cubit.dart';
import '../cubit/onboarding_state.dart';

enum _DominantHandChoice { right, left, ambidextrous }

extension on _DominantHandChoice {
  String get wire => switch (this) {
        _DominantHandChoice.right => 'RIGHT',
        _DominantHandChoice.left => 'LEFT',
        _DominantHandChoice.ambidextrous => 'AMBIDEXTROUS',
      };

  String get label => switch (this) {
        _DominantHandChoice.right => 'Diestro',
        _DominantHandChoice.left => 'Zurdo',
        _DominantHandChoice.ambidextrous => 'Ambidiestro',
      };
}

class _SportMeta {
  const _SportMeta({required this.icon, required this.color});
  final IconData icon;
  final Color color;
}

const _sportMetaByCode = <String, _SportMeta>{
  'PADEL': _SportMeta(icon: Icons.sports_tennis, color: Color(0xFF2E7D32)),
  'TENNIS': _SportMeta(icon: Icons.sports_tennis, color: Color(0xFF607D8B)),
  'PICKLEBALL': _SportMeta(icon: Icons.sports_tennis, color: Color(0xFF00897B)),
  'FOOTBALL5': _SportMeta(icon: Icons.sports_soccer, color: Color(0xFF455A64)),
  'BASKETBALL3X3': _SportMeta(icon: Icons.sports_basketball, color: Color(0xFFE65100)),
  'VOLLEY_BEACH': _SportMeta(icon: Icons.sports_volleyball, color: Color(0xFFFFB300)),
};

const _fallbackMeta = _SportMeta(icon: Icons.sports, color: Color(0xFF546E7A));

_SportMeta _metaFor(SportDto sport) {
  final key = sport.code.toUpperCase();
  return _sportMetaByCode[key] ?? _fallbackMeta;
}

class _PerSportSelection {
  SkillBand? band;
  String? categoryId;
  SidePreference courtSide = SidePreference.any;
}

class OnboardingSportProfilesPage extends StatefulWidget {
  const OnboardingSportProfilesPage({super.key, required this.onContinue});

  final VoidCallback onContinue;

  @override
  State<OnboardingSportProfilesPage> createState() => _OnboardingSportProfilesPageState();
}

class _OnboardingSportProfilesPageState extends State<OnboardingSportProfilesPage> {
  bool _loading = true;
  List<SportDto> _sports = const [];
  final Set<String> _selected = {};
  final Map<String, _PerSportSelection> _configBySportId = {};
  final Map<String, List<CategoryDto>> _categoriesBySportId = {};
  _DominantHandChoice _dominantHand = _DominantHandChoice.right;

  bool get _needsDominantHand =>
      _sports.any((s) => _selected.contains(s.id) && isRacketSportCode(s.code));

  @override
  void initState() {
    super.initState();
    _loadSports();
  }

  Future<void> _loadSports() async {
    try {
      final list = await getIt<CatalogRepository>().listSports();
      if (!mounted) return;
      setState(() {
        _sports = list;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _loadCategoriesForSport(String sportId) async {
    if (_categoriesBySportId.containsKey(sportId)) return;
    try {
      final list = await getIt<CatalogRepository>().listCategories(sportId: sportId);
      if (!mounted) return;
      setState(() => _categoriesBySportId[sportId] = list);
    } catch (_) {
      if (!mounted) return;
      setState(() => _categoriesBySportId[sportId] = const []);
    }
  }

  _PerSportSelection _configFor(String sportId) {
    return _configBySportId.putIfAbsent(sportId, _PerSportSelection.new);
  }

  List<CategoryDto> _categoriesForBand(SportDto sport, SkillBand band) {
    final all = _categoriesBySportId[sport.id] ?? const [];
    final bandWire = band.name.toUpperCase();
    return all.where((c) => c.skillBand?.toUpperCase() == bandWire).toList()
      ..sort((a, b) => b.sortOrder.compareTo(a.sortOrder));
  }

  Future<void> _submit() async {
    if (_selected.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona al menos un deporte.')),
      );
      return;
    }

    for (final sport in _sports.where((s) => _selected.contains(s.id))) {
      final cfg = _configFor(sport.id);
      if (cfg.band == null || cfg.categoryId == null || cfg.categoryId!.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Completa la categoría para ${sport.name}.')),
        );
        return;
      }
      if (isRacketSportCode(sport.code) && cfg.courtSide == SidePreference.any) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Indica drive o revés para ${sport.name}.')),
        );
        return;
      }
    }

    final items = <({
      String sportId,
      double skillLevel,
      SidePreference sidePreference,
      String? categoryId,
    })>[];

    for (final sport in _sports.where((s) => _selected.contains(s.id))) {
      final cfg = _configFor(sport.id);
      final cats = _categoriesBySportId[sport.id] ?? const [];
      final cat = cats.where((c) => c.id == cfg.categoryId).firstOrNull;
      final slug = cat?.slug ?? '4ta';
      final skill = isRacketSportCode(sport.code)
          ? _racketSkillFromSlug(slug)
          : _teamSkillFromSlug(slug);

      items.add((
        sportId: sport.id,
        skillLevel: skill,
        sidePreference: isRacketSportCode(sport.code) ? cfg.courtSide : SidePreference.any,
        categoryId: cfg.categoryId,
      ));
    }

    final ok = await context.read<OnboardingCubit>().saveSportProfiles(
          items: items,
          dominantHand: _needsDominantHand ? _dominantHand.wire : null,
        );
    if (!mounted) return;
    if (ok) widget.onContinue();
  }

  double _racketSkillFromSlug(String slug) => switch (slug) {
        '8va' => 1.5,
        '7ma' => 2.0,
        '6ta' => 2.5,
        '5ta' => 3.0,
        '4ta' => 3.5,
        '3ra' => 4.5,
        '2da' => 5.5,
        '1ra' => 6.5,
        _ => 3.5,
      };

  double _teamSkillFromSlug(String slug) => switch (slug) {
        'recreativo' => 2.0,
        'intermedio' => 3.5,
        'competitivo' => 5.0,
        _ => 3.5,
      };

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OnboardingCubit, OnboardingState>(
      builder: (context, state) {
        final saving = state.savingStep == OnboardingStep.sportProfiles;
        final scheme = Theme.of(context).colorScheme;

        if (_loading) {
          return const Center(child: CircularProgressIndicator());
        }
        if (_sports.isEmpty) {
          return const Center(child: Text('No hay deportes configurados.'));
        }

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Tus deportes', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 6),
                Text(
                  'Elige deportes, categoría y datos técnicos.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 14),
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisSpacing: 10,
                            crossAxisSpacing: 10,
                            childAspectRatio: 2.4,
                          ),
                          itemCount: _sports.length,
                          itemBuilder: (_, i) {
                            final sport = _sports[i];
                            final selected = _selected.contains(sport.id);
                            return _SportTile(
                              sport: sport,
                              selected: selected,
                              onTap: () async {
                                setState(() {
                                  if (selected) {
                                    _selected.remove(sport.id);
                                  } else {
                                    _selected.add(sport.id);
                                  }
                                });
                                if (!selected) {
                                  await _loadCategoriesForSport(sport.id);
                                }
                              },
                            );
                          },
                        ),
                        const SizedBox(height: 20),
                        for (final sport in _sports.where((s) => _selected.contains(s.id)))
                          _SportClassificationCard(
                            sport: sport,
                            config: _configFor(sport.id),
                            categories: _categoriesBySportId[sport.id],
                            onBandChanged: (b) => setState(() {
                              _configFor(sport.id).band = b;
                              _configFor(sport.id).categoryId = null;
                            }),
                            onCategoryChanged: (id) =>
                                setState(() => _configFor(sport.id).categoryId = id),
                            onCourtSideChanged: (side) =>
                                setState(() => _configFor(sport.id).courtSide = side),
                            categoriesForBand: _categoriesForBand,
                          ),
                        if (_needsDominantHand) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Mano dominante',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            children: _DominantHandChoice.values.map((h) {
                              final selected = _dominantHand == h;
                              return ChoiceChip(
                                label: Text(h.label),
                                selected: selected,
                                onSelected: (_) => setState(() => _dominantHand = h),
                              );
                            }).toList(),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                if (state.errorMessage != null && !saving)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      state.errorMessage!,
                      style: TextStyle(color: scheme.error),
                    ),
                  ),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: saving ? null : _submit,
                    child: saving
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Continuar'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _SportClassificationCard extends StatelessWidget {
  const _SportClassificationCard({
    required this.sport,
    required this.config,
    required this.categories,
    required this.onBandChanged,
    required this.onCategoryChanged,
    required this.onCourtSideChanged,
    required this.categoriesForBand,
  });

  final SportDto sport;
  final _PerSportSelection config;
  final List<CategoryDto>? categories;
  final ValueChanged<SkillBand> onBandChanged;
  final ValueChanged<String> onCategoryChanged;
  final ValueChanged<SidePreference> onCourtSideChanged;
  final List<CategoryDto> Function(SportDto sport, SkillBand band) categoriesForBand;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isRacket = isRacketSportCode(sport.code);
    final isTeam = isTeamSportCode(sport.code);

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              sport.name,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                  ),
            ),
            const SizedBox(height: 10),
            Text(
              isRacket ? 'Tu banda de nivel' : 'Tu nivel',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: SkillBand.values.map((band) {
                final selected = config.band == band;
                return FilterChip(
                  label: Text(skillBandLabel(band)),
                  selected: selected,
                  onSelected: (_) => onBandChanged(band),
                );
              }).toList(),
            ),
            if (config.band != null) ...[
              const SizedBox(height: 6),
              Text(
                isRacket
                    ? skillBandDescription(config.band!)
                    : teamBandDescription(config.band!),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
              ),
              const SizedBox(height: 10),
              Text(
                isRacket ? 'Categoría' : 'Nivel',
                style: Theme.of(context).textTheme.labelLarge,
              ),
              const SizedBox(height: 6),
              if (categories == null)
                const LinearProgressIndicator()
              else if (categoriesForBand(sport, config.band!).isEmpty)
                Text(
                  'Sin categorías para este deporte. Ejecuta el seed de la API.',
                  style: TextStyle(color: scheme.error, fontSize: 12),
                )
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: categoriesForBand(sport, config.band!).map((c) {
                    final selected = config.categoryId == c.id;
                    return ChoiceChip(
                      label: Text(c.name),
                      selected: selected,
                      onSelected: (_) => onCategoryChanged(c.id),
                    );
                  }).toList(),
                ),
            ],
            if (isRacket && config.categoryId != null) ...[
              const SizedBox(height: 12),
              Text(
                'Lado preferido en cancha',
                style: Theme.of(context).textTheme.labelLarge,
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Drive (derecha)'),
                      selected: config.courtSide == SidePreference.right,
                      onSelected: (_) => onCourtSideChanged(SidePreference.right),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: const Text('Revés (izquierda)'),
                      selected: config.courtSide == SidePreference.left,
                      onSelected: (_) => onCourtSideChanged(SidePreference.left),
                    ),
                  ),
                ],
              ),
            ],
            if (!isRacket && !isTeam)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  'Selecciona banda y categoría si el deporte lo requiere.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SportTile extends StatelessWidget {
  const _SportTile({
    required this.sport,
    required this.selected,
    required this.onTap,
  });

  final SportDto sport;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final meta = _metaFor(sport);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          color: selected ? scheme.primary.withValues(alpha: .08) : scheme.surface,
          border: Border.all(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: meta.color.withValues(alpha: .15),
              ),
              child: Icon(meta.icon, color: meta.color, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                sport.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
            if (selected) Icon(Icons.check_circle, size: 20, color: scheme.primary),
          ],
        ),
      ),
    );
  }
}
