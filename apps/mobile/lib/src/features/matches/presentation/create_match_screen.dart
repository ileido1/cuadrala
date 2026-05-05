import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../router/routes.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/data/models/sport_dto.dart';
import '../data/matches_repository.dart';

final class CreateMatchScreen extends StatefulWidget {
  const CreateMatchScreen({super.key});

  @override
  State<CreateMatchScreen> createState() => _CreateMatchScreenState();
}

class _CreateMatchScreenState extends State<CreateMatchScreen> {
  final _clubController = TextEditingController();
  final _notesController = TextEditingController();

  List<SportDto> _sports = const [];
  String? _selectedSportId;

  String? _categoryId;
  int _players = 4;
  int _pricePerPlayer = 4500;
  bool _privateMatch = false;

  DateTime _selectedDate = DateTime.now();
  TimeOfDay _selectedTime = const TimeOfDay(hour: 20, minute: 0);

  bool _loading = true;
  bool _submitting = false;

  @override
  void dispose() {
    _clubController.dispose();
    _notesController.dispose();
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
      final sports = await getIt<CatalogRepository>().listSports();
      String? selected = sports.isEmpty ? null : sports.first.id;
      for (final s in sports) {
        if (s.code.toUpperCase() == 'PADEL') {
          selected = s.id;
          break;
        }
      }
      if (!mounted) return;
      setState(() {
        _sports = sports;
        _selectedSportId = selected;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _sports = const [];
        _selectedSportId = null;
        _loading = false;
      });
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 0)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked == null) return;
    setState(() => _selectedDate = picked);
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );
    if (picked == null) return;
    setState(() => _selectedTime = picked);
  }

  DateTime _scheduledAt() {
    return DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _selectedTime.hour,
      _selectedTime.minute,
    );
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
      final created = await getIt<MatchesRepository>().createMatch(
        sportId: sportId,
        categoryId: _categoryId!,
        type: 'REGULAR',
        scheduledAt: _scheduledAt().toUtc(),
        maxParticipants: _players,
        pricePerPlayerCents: _pricePerPlayer * 100,
      );
      if (!mounted) return;
      context.go(Routes.matchDetail(created.id));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo publicar: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
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
                        Text(
                          'DEPORTE',
                          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                fontWeight: FontWeight.w900,
                                color: scheme.onSurfaceVariant,
                              ),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          children: _sports
                              .map(
                                (s) => ChoiceChip(
                                  label: Text(s.name),
                                  selected: _selectedSportId == s.id,
                                  onSelected: (_) => setState(() => _selectedSportId = s.id),
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
                        const SizedBox(height: 16),
                        _SectionCard(
                          title: 'Sede / Cancha',
                          footer:
                              'MVP: búsqueda de sedes llega en M9 (Geo/Sedes).',
                          child: TextField(
                            controller: _clubController,
                            enabled: false,
                            decoration: const InputDecoration(
                              prefixIcon: Icon(Icons.location_on_outlined),
                              hintText: 'Buscar club…',
                            ),
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
                                title: 'Hora',
                                child: _CompactButton(
                                  icon: Icons.schedule,
                                  label: _selectedTime.format(context),
                                  onTap: _pickTime,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: _SectionCard(
                                title: 'Categoría',
                                child: _CompactButton(
                                  icon: Icons.tune,
                                  label: _categoryId == null ? 'Seleccionar' : 'Seleccionada',
                                  onTap: () => _pickCategoryId(context),
                                ),
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
                                          : () => setState(() => _players--),
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
                                          : () => setState(() => _players++),
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
                          child: TextField(
                            keyboardType: TextInputType.number,
                            controller: TextEditingController(text: _pricePerPlayer.toString()),
                            decoration: const InputDecoration(prefixIcon: Icon(Icons.attach_money)),
                            onChanged: (v) => setState(() {
                              _pricePerPlayer = int.tryParse(v) ?? _pricePerPlayer;
                            }),
                          ),
                        ),
                        const SizedBox(height: 12),
                        _SectionCard(
                          title: 'Partida Privada',
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  'Solo con link de invitación',
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                        color: scheme.onSurfaceVariant,
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                              ),
                              Switch(
                                value: _privateMatch,
                                onChanged: (v) => setState(() => _privateMatch = v),
                              ),
                            ],
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

  Future<void> _pickCategoryId(BuildContext context) async {
    final controller = TextEditingController(text: _categoryId ?? '');
    final result = await showModalBottomSheet<String?>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Categoría (UUID)',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: controller,
                decoration: const InputDecoration(hintText: 'Pega categoryId…'),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.of(context).pop(controller.text.trim()),
                  child: const Text('Aplicar'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    if (result == null) return;
    final value = result.trim();
    setState(() => _categoryId = value.isEmpty ? null : value);
  }
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

