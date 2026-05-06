import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/di/service_locator.dart';
import '../../../catalog/data/catalog_repository.dart';
import '../../../catalog/data/models/sport_dto.dart';
import '../../data/models/onboarding_status_dto.dart';
import '../../data/models/player_sport_profile_dto.dart';
import '../cubit/onboarding_cubit.dart';
import '../cubit/onboarding_state.dart';

enum _LevelChoice { beginner, intermediate, advanced }

extension on _LevelChoice {
  double get value => switch (this) {
        _LevelChoice.beginner => 1.5,
        _LevelChoice.intermediate => 3.5,
        _LevelChoice.advanced => 5.5,
      };

  String get title => switch (this) {
        _LevelChoice.beginner => 'Principiante',
        _LevelChoice.intermediate => 'Intermedio',
        _LevelChoice.advanced => 'Avanzado',
      };

  String get subtitle => switch (this) {
        _LevelChoice.beginner => 'Estoy aprendiendo',
        _LevelChoice.intermediate => 'Juego con regularidad',
        _LevelChoice.advanced => 'Compito en torneos',
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
  'PICKLEBALL': _SportMeta(icon: Icons.sports_baseball, color: Color(0xFFEF6C00)),
  'FOOTBALL5': _SportMeta(icon: Icons.sports_soccer, color: Color(0xFF455A64)),
  'BASKETBALL3X3': _SportMeta(icon: Icons.sports_basketball, color: Color(0xFFE65100)),
  'VOLLEY_BEACH': _SportMeta(icon: Icons.sports_volleyball, color: Color(0xFFFFB300)),
};

const _fallbackMeta = _SportMeta(icon: Icons.sports, color: Color(0xFF546E7A));

_SportMeta _metaFor(SportDto sport) {
  final key = sport.code.toUpperCase();
  return _sportMetaByCode[key] ?? _fallbackMeta;
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
  _LevelChoice _level = _LevelChoice.intermediate;

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

  Future<void> _submit() async {
    if (_selected.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona al menos un deporte.')),
      );
      return;
    }
    final items = _selected
        .map((sportId) => (
              sportId: sportId,
              skillLevel: _level.value,
              sidePreference: SidePreference.any,
            ))
        .toList();
    final ok = await context.read<OnboardingCubit>().saveSportProfiles(items);
    if (!mounted) return;
    if (ok) widget.onContinue();
  }

  String _selectedSummary() {
    final names = _sports
        .where((s) => _selected.contains(s.id))
        .map((s) => s.name)
        .toList();
    return names.join(', ');
  }

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
                  'Selecciona todos los que practicas.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 18),
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
                              onTap: () => setState(() {
                                if (selected) {
                                  _selected.remove(sport.id);
                                } else {
                                  _selected.add(sport.id);
                                }
                              }),
                            );
                          },
                        ),
                        const SizedBox(height: 8),
                        if (_selected.isNotEmpty)
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: scheme.primary,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  '${_selected.length} deporte${_selected.length == 1 ? "" : "s"} seleccionado${_selected.length == 1 ? "" : "s"}: ${_selectedSummary()}',
                                  style: TextStyle(color: scheme.onSurfaceVariant),
                                ),
                              ),
                            ],
                          ),
                        const SizedBox(height: 22),
                        Text(
                          'Tu nivel general',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w900,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Puedes ajustarlo por deporte en el perfil.',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: scheme.onSurfaceVariant,
                              ),
                        ),
                        const SizedBox(height: 12),
                        for (final l in _LevelChoice.values) ...[
                          _LevelTile(
                            choice: l,
                            selected: _level == l,
                            onTap: () => setState(() => _level = l),
                          ),
                          const SizedBox(height: 10),
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
                      style: TextStyle(color: Theme.of(context).colorScheme.error),
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
            if (selected)
              Icon(Icons.check_circle, size: 20, color: scheme.primary),
          ],
        ),
      ),
    );
  }
}

class _LevelTile extends StatelessWidget {
  const _LevelTile({
    required this.choice,
    required this.selected,
    required this.onTap,
  });

  final _LevelChoice choice;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: selected ? scheme.primary.withValues(alpha: .08) : scheme.surface,
          border: Border.all(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    choice.title,
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    choice.subtitle,
                    style: TextStyle(color: scheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected ? scheme.primary : Colors.transparent,
                border: Border.all(
                  color: selected ? scheme.primary : scheme.outline,
                  width: 1.5,
                ),
              ),
              child: selected
                  ? Icon(Icons.check, size: 16, color: scheme.onPrimary)
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
