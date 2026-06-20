import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:phone_form_field/phone_form_field.dart';

import '../../../../core/di/service_locator.dart';
import '../../../../core/theme/app_icons.dart';
import '../../../../shared/widgets/primary_button.dart';
import '../../../profile/data/profile_repository.dart';
import '../../data/models/onboarding_status_dto.dart';
import '../cubit/onboarding_cubit.dart';
import '../cubit/onboarding_state.dart';

class OnboardingIdentityPage extends StatefulWidget {
  const OnboardingIdentityPage({super.key, required this.onContinue});

  final VoidCallback onContinue;

  @override
  State<OnboardingIdentityPage> createState() => _OnboardingIdentityPageState();
}

class _OnboardingIdentityPageState extends State<OnboardingIdentityPage> {
  final _nameController = TextEditingController();
  final _phoneController = PhoneController();
  DateTime? _birthDate;
  final _cityController = TextEditingController();
  final _documentController = TextEditingController();
  String? _nameError;
  String? _phoneError;
  String? _birthError;
  String? _documentError;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    try {
      final me = await getIt<ProfileRepository>().getMe();
      if (!mounted) return;
      _nameController.text = me.name;
    } catch (_) {
      // Si falla, dejamos los inputs vacíos.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _cityController.dispose();
    _documentController.dispose();
    super.dispose();
  }

  bool _validate() {
    final name = _nameController.text.trim();
    final nameValid = name.length >= 2;
    final phone = _phoneController.value;
    final phoneValid = phone.isValid();
    final birthValid = _birthDate != null && _birthDate!.year >= 1920;
    final document = _documentController.text.trim();
    final documentValid = document.isEmpty || document.length >= 6;
    setState(() {
      _nameError = nameValid ? null : 'Ingresa tu nombre completo.';
      _phoneError = phoneValid ? null : 'Teléfono inválido.';
      _birthError = birthValid ? null : 'Selecciona tu fecha de nacimiento.';
      _documentError = documentValid ? null : 'Mínimo 6 caracteres.';
    });
    return nameValid && phoneValid && birthValid && documentValid;
  }

  Future<void> _submit() async {
    if (!_validate()) return;
    final phoneE164 = _phoneController.value.international;
    final birthYear = _birthDate!.year;
    final ok = await context.read<OnboardingCubit>().saveIdentity(
          name: _nameController.text.trim(),
          phone: phoneE164,
          birthYear: birthYear,
          birthDate: _birthDate,
          city: _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
          documentNumber: _documentController.text.trim().isEmpty ? null : _documentController.text.trim(),
        );
    if (!mounted) return;
    if (ok) widget.onContinue();
  }

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final initial = _birthDate ?? DateTime(now.year - 25, 1, 1);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1920, 1, 1),
      lastDate: DateTime(now.year - 12, 12, 31),
      helpText: 'Selecciona tu fecha de nacimiento',
    );
    if (!mounted) return;
    if (picked != null) setState(() => _birthDate = picked);
  }

  String get _initials {
    final raw = _nameController.text.trim();
    if (raw.isEmpty) return '?';
    final parts = raw.split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts.last.characters.first).toUpperCase();
  }

  void _onAvatarTap() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Pronto: subir tu foto de perfil con la cámara o galería.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OnboardingCubit, OnboardingState>(
      builder: (context, state) {
        final saving = state.savingStep == OnboardingStep.identity;
        final scheme = Theme.of(context).colorScheme;

        if (_loading) {
          return const Center(child: CircularProgressIndicator());
        }

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Tu perfil', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 6),
                Text(
                  'Así te verán los otros jugadores.',
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
                        Center(
                          child: _AvatarPicker(
                            initials: _initials,
                            onTap: _onAvatarTap,
                          ),
                        ),
                        const SizedBox(height: 26),
                        TextField(
                          controller: _nameController,
                          textInputAction: TextInputAction.next,
                          textCapitalization: TextCapitalization.words,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            labelText: 'Nombre completo',
                            hintText: 'Carlos Rodríguez',
                            prefixIcon: const Icon(AppIcons.person),
                            errorText: _nameError,
                          ),
                        ),
                        const SizedBox(height: 16),
                        PhoneFormField(
                          controller: _phoneController,
                          decoration: InputDecoration(
                            labelText: 'Teléfono (WhatsApp)',
                            hintText: '+58 412 555 1234',
                            prefixIcon: const Icon(AppIcons.phone),
                            errorText: _phoneError,
                            helperText: 'Te avisamos cuando una partida está cuadrada.',
                          ),
                          isCountrySelectionEnabled: true,
                          isCountryButtonPersistent: true,
                          autovalidateMode: AutovalidateMode.disabled,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _documentController,
                          keyboardType: TextInputType.number,
                          textInputAction: TextInputAction.next,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            labelText: 'Número de documento (DNI)',
                            hintText: 'Ej: 12345678',
                            prefixIcon: const Icon(AppIcons.badge),
                            errorText: _documentError,
                            helperText: 'Opcional. Solo números sin puntos ni guiones.',
                          ),
                        ),
                        const SizedBox(height: 16),
                        InkWell(
                          onTap: _pickBirthDate,
                          borderRadius: BorderRadius.circular(16),
                          child: InputDecorator(
                            decoration: InputDecoration(
                              labelText: 'Fecha de nacimiento',
                              prefixIcon: const Icon(AppIcons.cake),
                              errorText: _birthError,
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    _birthDate == null
                                        ? 'Seleccionar'
                                        : '${_birthDate!.year.toString().padLeft(4, '0')}-${_birthDate!.month.toString().padLeft(2, '0')}-${_birthDate!.day.toString().padLeft(2, '0')}',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: Theme.of(context).colorScheme.onSurface,
                                    ),
                                  ),
                                ),
                                const Icon(AppIcons.calendar),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _cityController,
                          textCapitalization: TextCapitalization.words,
                          onChanged: (_) => setState(() {}),
                          decoration: const InputDecoration(
                            labelText: 'Ciudad',
                            hintText: 'Caracas, Venezuela',
                            prefixIcon: Icon(AppIcons.pin),
                            helperText: 'La usamos para mostrarte partidas y canchas cercanas.',
                          ),
                        ),
                        const SizedBox(height: 24),
                        _ProfilePreviewCard(
                          name: _nameController.text.trim(),
                          city: _cityController.text.trim(),
                          initials: _initials,
                        ),
                      ],
                    ),
                  ),
                ),
                if (state.errorMessage != null && !saving) ...[
                  Text(
                    state.errorMessage!,
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                  const SizedBox(height: 8),
                ],
                PrimaryButton(
                  label: 'Continuar',
                  icon: AppIcons.arrowForward,
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

class _AvatarPicker extends StatelessWidget {
  const _AvatarPicker({required this.initials, required this.onTap});

  final String initials;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: Stack(
            alignment: Alignment.bottomRight,
            children: [
              Container(
                width: 108,
                height: 108,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: scheme.primary,
                ),
                child: Text(
                  initials,
                  style: TextStyle(
                    color: scheme.onPrimary,
                    fontSize: 38,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: scheme.surface,
                  border: Border.all(
                    color: Theme.of(context).scaffoldBackgroundColor,
                    width: 2.5,
                  ),
                ),
                child: Icon(AppIcons.camera, size: 17, color: scheme.onSurface),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Toca para cambiar la foto',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: scheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}

class _ProfilePreviewCard extends StatelessWidget {
  const _ProfilePreviewCard({
    required this.name,
    required this.city,
    required this.initials,
  });

  final String name;
  final String city;
  final String initials;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final showName = name.isNotEmpty ? name : 'Tu nombre';
    final showCity = city.isNotEmpty ? city : 'Tu ciudad';
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: scheme.surfaceContainerHighest,
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'VISTA PREVIA DE TU PERFIL',
            style: TextStyle(
              fontSize: 13,
              letterSpacing: 0.3,
              fontWeight: FontWeight.w700,
              color: scheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: scheme.primary,
                child: Text(
                  initials,
                  style: TextStyle(
                    color: scheme.onPrimary,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(showName,
                        style: const TextStyle(
                            fontWeight: FontWeight.w900, fontSize: 15)),
                    const SizedBox(height: 2),
                    Text(showCity, style: TextStyle(color: scheme.onSurfaceVariant)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: .14),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Nuevo',
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    color: scheme.primary,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
