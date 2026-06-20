import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/di/service_locator.dart';
import '../../../../core/location/location_service.dart';
import '../../../../shared/widgets/primary_button.dart';
import '../../../../shared/widgets/selectable_chip.dart';
import '../../data/models/onboarding_status_dto.dart';
import '../cubit/onboarding_cubit.dart';
import '../cubit/onboarding_state.dart';

class OnboardingLocationPage extends StatefulWidget {
  const OnboardingLocationPage({super.key, required this.onContinue});

  final VoidCallback onContinue;

  @override
  State<OnboardingLocationPage> createState() => _OnboardingLocationPageState();
}

class _OnboardingLocationPageState extends State<OnboardingLocationPage> {
  static const _suggestedRadii = <int>[5, 10, 20, 30];

  final _labelController = TextEditingController();
  final _latController = TextEditingController(text: '10.4806');
  final _lngController = TextEditingController(text: '-66.9036');
  int _radiusKm = 10;
  bool _showAdvanced = false;
  bool _detectingLocation = false;
  String? _formError;

  @override
  void dispose() {
    _labelController.dispose();
    _latController.dispose();
    _lngController.dispose();
    super.dispose();
  }

  Future<void> _useDeviceLocation() async {
    if (_detectingLocation) return;
    setState(() {
      _detectingLocation = true;
      _formError = null;
    });
    try {
      final loc = await getIt<LocationService>().getCurrentLocation();
      if (!mounted) return;
      setState(() {
        _latController.text = loc.latitude.toStringAsFixed(6);
        _lngController.text = loc.longitude.toStringAsFixed(6);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ubicación detectada. Ajusta el radio si quieres.'),
        ),
      );
    } on LocationFailure catch (f) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(f.message)),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No pudimos detectar tu ubicación. Inténtalo de nuevo.'),
        ),
      );
    } finally {
      if (mounted) setState(() => _detectingLocation = false);
    }
  }

  Future<void> _submit() async {
    final lat = double.tryParse(_latController.text.trim());
    final lng = double.tryParse(_lngController.text.trim());
    if (lat == null || lat < -90 || lat > 90 || lng == null || lng < -180 || lng > 180) {
      setState(() => _formError = 'Latitud (-90 a 90) y longitud (-180 a 180) inválidas.');
      return;
    }
    setState(() => _formError = null);
    final ok = await context.read<OnboardingCubit>().saveLocation(
          label: _labelController.text.trim().isEmpty ? null : _labelController.text.trim(),
          latitude: lat,
          longitude: lng,
          radiusKm: _radiusKm,
        );
    if (!mounted) return;
    if (ok) widget.onContinue();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OnboardingCubit, OnboardingState>(
      builder: (context, state) {
        final saving = state.savingStep == OnboardingStep.location;
        final scheme = Theme.of(context).colorScheme;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('¿Dónde te queda mejor jugar?',
                    style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 6),
                Text(
                  'Te avisaremos solo de partidas dentro de tu radio. Podrás cambiarlo cuando quieras.',
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
                        _GpsCard(
                          onTap: _useDeviceLocation,
                          loading: _detectingLocation,
                        ),
                        const SizedBox(height: 16),
                        const _SectionTitle(title: 'Tu zona'),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _labelController,
                          decoration: const InputDecoration(
                            labelText: 'Zona o ciudad (opcional)',
                            hintText: 'Caracas — La Castellana',
                            prefixIcon: Icon(Icons.place_outlined),
                          ),
                        ),
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            const Expanded(child: _SectionTitle(title: 'Radio de búsqueda')),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 11, vertical: 4),
                              decoration: BoxDecoration(
                                color: scheme.primary.withValues(alpha: .15),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                '$_radiusKm km',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: scheme.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            for (final r in _suggestedRadii)
                              SelectableChip(
                                label: '$r km',
                                selected: _radiusKm == r,
                                onTap: () => setState(() => _radiusKm = r),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Slider(
                          value: _radiusKm.toDouble(),
                          min: 1,
                          max: 100,
                          divisions: 99,
                          label: '$_radiusKm km',
                          onChanged: (v) => setState(() => _radiusKm = v.round()),
                        ),
                        const SizedBox(height: 20),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          decoration: BoxDecoration(
                            color: scheme.surface,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: scheme.outlineVariant, width: 1.5),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Ajustar coordenadas manualmente',
                                      style: TextStyle(
                                        fontSize: 14.5,
                                        fontWeight: FontWeight.w700,
                                        color: scheme.onSurface,
                                      ),
                                    ),
                                    Text(
                                      'Para mayor precisión',
                                      style: TextStyle(
                                        fontSize: 12.5,
                                        color: scheme.onSurfaceVariant,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Switch(
                                value: _showAdvanced,
                                onChanged: (v) => setState(() => _showAdvanced = v),
                              ),
                            ],
                          ),
                        ),
                        if (_showAdvanced) ...[
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _latController,
                                  keyboardType: const TextInputType.numberWithOptions(
                                    decimal: true,
                                    signed: true,
                                  ),
                                  inputFormatters: [
                                    FilteringTextInputFormatter.allow(RegExp(r'[-\d.]')),
                                  ],
                                  decoration: const InputDecoration(
                                    labelText: 'Latitud',
                                    prefixIcon: Icon(Icons.my_location_outlined),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: TextField(
                                  controller: _lngController,
                                  keyboardType: const TextInputType.numberWithOptions(
                                    decimal: true,
                                    signed: true,
                                  ),
                                  inputFormatters: [
                                    FilteringTextInputFormatter.allow(RegExp(r'[-\d.]')),
                                  ],
                                  decoration: const InputDecoration(
                                    labelText: 'Longitud',
                                    prefixIcon: Icon(Icons.explore_outlined),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                        if (_formError != null) ...[
                          const SizedBox(height: 12),
                          Text(_formError!,
                              style: TextStyle(color: Theme.of(context).colorScheme.error)),
                        ],
                        if (state.errorMessage != null && !saving) ...[
                          const SizedBox(height: 8),
                          Text(state.errorMessage!,
                              style: TextStyle(color: Theme.of(context).colorScheme.error)),
                        ],
                      ],
                    ),
                  ),
                ),
                PrimaryButton(
                  label: 'Continuar',
                  icon: Icons.arrow_forward,
                  height: 54,
                  isLoading: saving,
                  onPressed: _submit,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _GpsCard extends StatelessWidget {
  const _GpsCard({required this.onTap, this.loading = false});

  final VoidCallback onTap;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: loading ? null : onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: scheme.primary.withValues(alpha: .15),
          border: Border.all(color: scheme.primary, width: 1.5),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: scheme.primary,
              ),
              child: loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.4,
                        valueColor: AlwaysStoppedAnimation(Colors.white),
                      ),
                    )
                  : const Icon(Icons.gps_fixed, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    loading ? 'Detectando ubicación...' : 'Usar mi ubicación',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 15.5,
                      color: scheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    loading
                        ? 'Espera unos segundos…'
                        : 'Detectaremos tu zona automáticamente.',
                    style: TextStyle(
                      fontSize: 13,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            if (!loading) Icon(Icons.chevron_right, color: scheme.primary),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w900,
          ),
    );
  }
}
