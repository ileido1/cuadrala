import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/cubit/session_cubit.dart';
import '../data/onboarding_repository.dart';
import 'cubit/onboarding_cubit.dart';
import 'cubit/onboarding_state.dart';
import 'pages/availability_page.dart';
import 'pages/identity_page.dart';
import 'pages/location_page.dart';
import 'pages/sport_profiles_page.dart';

final class OnboardingFlowScreen extends StatelessWidget {
  const OnboardingFlowScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // El BlocProvider.externally supplied permite que los tests injecten un cubit mockeado.
    // En producción, OnboardingCubit se registra en getIt antes de navegar aquí.
    return BlocProvider<OnboardingCubit>(
      create: (_) => getIt<OnboardingCubit>()..load(),
      child: Builder(
        builder: (context) => const _OnboardingFlowView(),
      ),
    );
  }
}

class _OnboardingFlowView extends StatefulWidget {
  const _OnboardingFlowView();

  @override
  State<_OnboardingFlowView> createState() => _OnboardingFlowViewState();
}

class _OnboardingFlowViewState extends State<_OnboardingFlowView> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _next() async {
    if (_currentPage < 3) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOut,
      );
    } else {
      // Capturar el cubit antes del gap async para evitar el warning.
      final sessionCubit = context.read<SessionCubit>();
      await getIt<OnboardingRepository>().completeOnboarding();
      await sessionCubit.refreshOnboardingStatus();
      if (!mounted) return;
      context.go(Routes.home);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('onboarding.flow.screen'),
      body: BlocBuilder<OnboardingCubit, OnboardingState>(
        builder: (context, state) {
          if (state.type == OnboardingStatusType.loading || state.type == OnboardingStatusType.initial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.type == OnboardingStatusType.error) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 48),
                    const SizedBox(height: 12),
                    Text(state.errorMessage ?? 'No se pudo cargar el onboarding.'),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () => context.read<OnboardingCubit>().load(),
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            );
          }

          return Column(
            children: [
              _OnboardingHeader(
                currentPage: _currentPage,
                total: 4,
                onBack: _currentPage > 0
                    ? () => _pageController.previousPage(
                          duration: const Duration(milliseconds: 240),
                          curve: Curves.easeOut,
                        )
                    : () => context.go(Routes.register),
              ),
              Expanded(
                child: PageView(
                  controller: _pageController,
                  physics: const NeverScrollableScrollPhysics(),
                  onPageChanged: (i) => setState(() => _currentPage = i),
                  children: [
                    OnboardingIdentityPage(onContinue: _next),
                    OnboardingSportProfilesPage(onContinue: _next),
                    OnboardingLocationPage(onContinue: _next),
                    OnboardingAvailabilityPage(onContinue: _next),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _OnboardingHeader extends StatelessWidget {
  const _OnboardingHeader({
    required this.currentPage,
    required this.total,
    required this.onBack,
  });

  final int currentPage;
  final int total;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surfaceContainerLow,
      child: SafeArea(
        bottom: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.6)),
            ),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  InkWell(
                    onTap: onBack,
                    borderRadius: BorderRadius.circular(11),
                    child: Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: scheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(11),
                      ),
                      child: const Icon(Icons.chevron_left, size: 20),
                    ),
                  ),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'Configura tu perfil',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                        ),
                        Text(
                          'Paso ${currentPage + 1} de $total',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 38),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: List.generate(total, (i) {
                  final active = i < currentPage + 1;
                  return Expanded(
                    child: Container(
                      height: 4,
                      margin: EdgeInsets.only(right: i < total - 1 ? 6 : 0),
                      decoration: BoxDecoration(
                        color: active ? scheme.primary : scheme.outlineVariant,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
