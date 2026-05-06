import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../router/routes.dart';
import '../../auth/presentation/cubit/session_cubit.dart';
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
    return BlocProvider<OnboardingCubit>(
      create: (_) => getIt<OnboardingCubit>()..load(),
      child: const _OnboardingFlowView(),
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
      // Marca onboarding como completo en el SessionCubit para que el guard del router
      // permita el acceso a /home y deje de redirigir a /onboarding.
      await context.read<SessionCubit>().refreshOnboardingStatus();
      if (!mounted) return;
      context.go(Routes.home);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('onboarding.flow.screen'),
      appBar: AppBar(
        title: Text('Configura tu perfil — paso ${_currentPage + 1} de 4'),
        leading: _currentPage == 0
            ? null
            : IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => _pageController.previousPage(
                  duration: const Duration(milliseconds: 240),
                  curve: Curves.easeOut,
                ),
              ),
      ),
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
              _ProgressIndicator(currentPage: _currentPage, total: 4),
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

class _ProgressIndicator extends StatelessWidget {
  const _ProgressIndicator({required this.currentPage, required this.total});

  final int currentPage;
  final int total;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(
        children: List.generate(total, (i) {
          final active = i <= currentPage;
          return Expanded(
            child: Container(
              height: 4,
              margin: EdgeInsets.only(right: i < total - 1 ? 6 : 0),
              decoration: BoxDecoration(
                color: active ? scheme.primary : scheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          );
        }),
      ),
    );
  }
}
