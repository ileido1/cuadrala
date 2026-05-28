import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../catalog/data/catalog_repository.dart';
import '../../catalog/data/models/category_dto.dart';
import '../../matches/data/matches_repository.dart';

// ---------------------------------------------------------------------------
// Payment status — UI-only enum, never sent to backend
// ---------------------------------------------------------------------------

enum _PaymentStatus { mustPay, alreadyPaid, pending }

extension _PaymentStatusLabel on _PaymentStatus {
  String get label => switch (this) {
        _PaymentStatus.mustPay => 'Debo pagar',
        _PaymentStatus.alreadyPaid => 'Ya pagué',
        _PaymentStatus.pending => 'Pendiente',
      };
}

// ---------------------------------------------------------------------------
// VenueMatchCreationScreen
//
// Full form screen for creating a match from a venue booking.
// Dependencies are injected via constructor (resolved at route level in
// app_router.dart via getIt — never calls getIt internally).
// ---------------------------------------------------------------------------

final class VenueMatchCreationScreen extends StatefulWidget {
  const VenueMatchCreationScreen({
    super.key,
    required this.venueId,
    this.courtId,
    this.scheduledAt,
    required this.matchesRepository,
    required this.catalogRepository,
  });

  final String venueId;
  final String? courtId;
  final String? scheduledAt;
  final MatchesRepository matchesRepository;
  final CatalogRepository catalogRepository;

  @override
  State<VenueMatchCreationScreen> createState() =>
      _VenueMatchCreationScreenState();
}

class _VenueMatchCreationScreenState extends State<VenueMatchCreationScreen> {
  // Form state
  String? _selectedCategoryId;
  bool _affectsElo = true;
  String? _selectedGender; // 'MALE' | 'FEMALE' | 'MIXED' | null
  _PaymentStatus? _paymentStatus; // UI-only

  // Load state
  bool _loading = true;
  String? _error;
  List<CategoryDto> _categories = [];
  String? _sportId;

  // Submit state
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    try {
      final sports = await widget.catalogRepository.listSports();
      if (!mounted) return;

      // Default to PADEL if present, else first sport
      final sport = sports.firstWhere(
        (s) => s.code.toUpperCase() == 'PADEL',
        orElse: () => sports.first,
      );

      final categories = await widget.catalogRepository
          .listCategories(sportId: sport.id);
      if (!mounted) return;

      setState(() {
        _sportId = sport.id;
        _categories = categories;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _submit() async {
    final categoryId = _selectedCategoryId;
    final sportId = _sportId;
    if (categoryId == null || sportId == null) return;

    setState(() => _submitting = true);

    try {
      final scheduledAt = widget.scheduledAt != null
          ? DateTime.tryParse(widget.scheduledAt!)
          : null;

      final match = await widget.matchesRepository.createMatch(
        sportId: sportId,
        categoryId: categoryId,
        type: 'OPEN',
        courtId: widget.courtId,
        venueId: widget.venueId,
        scheduledAt: scheduledAt,
        affectsElo: _affectsElo,
        gender: _selectedGender,
      );

      if (!mounted) return;
      context.go('/matches/${match.id}');
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    }
  }

  bool get _canSubmit =>
      _selectedCategoryId != null && !_submitting && !_loading;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Crear partido'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48),
                        const SizedBox(height: 12),
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: () {
                            setState(() {
                              _loading = true;
                              _error = null;
                            });
                            _loadCategories();
                          },
                          child: const Text('Reintentar'),
                        ),
                      ],
                    ),
                  ),
                )
              : _buildForm(scheme),
      bottomNavigationBar: _loading || _error != null
          ? null
          : Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _canSubmit ? _submit : null,
                  child: _submitting
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Crear partido'),
                ),
              ),
            ),
    );
  }

  Widget _buildForm(ColorScheme scheme) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Scheduled time info
        if (widget.scheduledAt != null) ...[
          _InfoRow(
            icon: Icons.access_time_rounded,
            label: _formatScheduledAt(widget.scheduledAt!),
          ),
          const SizedBox(height: 8),
        ],

        // Section: Categoría
        _SectionLabel(label: 'Categoría', required: true),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: _categories.map((cat) {
            final selected = _selectedCategoryId == cat.id;
            return FilterChip(
              label: Text(cat.name),
              selected: selected,
              onSelected: (_) {
                setState(() {
                  _selectedCategoryId = selected ? null : cat.id;
                });
              },
            );
          }).toList(),
        ),

        const SizedBox(height: 20),

        // Section: Afecta ELO
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Afecta ELO',
                    style: Theme.of(context)
                        .textTheme
                        .labelLarge
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  Text(
                    'El resultado modifica el ranking de los jugadores',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                  ),
                ],
              ),
            ),
            Switch(
              value: _affectsElo,
              onChanged: (val) => setState(() => _affectsElo = val),
            ),
          ],
        ),

        const SizedBox(height: 20),

        // Section: Género
        _SectionLabel(label: 'Género'),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            _GenderChip(
              label: 'Masculino',
              value: 'MALE',
              selectedValue: _selectedGender,
              onSelected: (val) =>
                  setState(() => _selectedGender = val == _selectedGender ? null : val),
            ),
            _GenderChip(
              label: 'Femenino',
              value: 'FEMALE',
              selectedValue: _selectedGender,
              onSelected: (val) =>
                  setState(() => _selectedGender = val == _selectedGender ? null : val),
            ),
            _GenderChip(
              label: 'Mixto',
              value: 'MIXED',
              selectedValue: _selectedGender,
              onSelected: (val) =>
                  setState(() => _selectedGender = val == _selectedGender ? null : val),
            ),
          ],
        ),

        const SizedBox(height: 20),

        // Section: Pago (UI-only)
        _SectionLabel(label: 'Estado de pago'),
        const SizedBox(height: 4),
        Text(
          'Solo visible para vos — no afecta el partido',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: _PaymentStatus.values.map((status) {
            final selected = _paymentStatus == status;
            return FilterChip(
              label: Text(status.label),
              selected: selected,
              onSelected: (_) {
                setState(() {
                  _paymentStatus = selected ? null : status;
                });
              },
            );
          }).toList(),
        ),

        const SizedBox(height: 24),
      ],
    );
  }

  String _formatScheduledAt(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    final local = dt.toLocal();
    return '${local.day}/${local.month}/${local.year} ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }
}

// ---------------------------------------------------------------------------
// Helper widgets
// ---------------------------------------------------------------------------

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.label, this.required = false});

  final String label;
  final bool required;

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        text: label,
        style: Theme.of(context)
            .textTheme
            .labelLarge
            ?.copyWith(fontWeight: FontWeight.w700),
        children: [
          if (required)
            const TextSpan(
              text: ' *',
              style: TextStyle(color: Colors.red),
            ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: scheme.onSurfaceVariant),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(color: scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _GenderChip extends StatelessWidget {
  const _GenderChip({
    required this.label,
    required this.value,
    required this.selectedValue,
    required this.onSelected,
  });

  final String label;
  final String value;
  final String? selectedValue;
  final void Function(String value) onSelected;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selectedValue == value,
      onSelected: (_) => onSelected(value),
    );
  }
}
