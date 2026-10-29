import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/network/api_client.dart';
import '../../auth/data/auth_repository.dart';
import '../data/models/tournament_invite_link_dto.dart';
import '../data/tournament_invite_link_api.dart';
import '../data/tournament_invite_link_repository.dart';
import 'cubit/tournament_invite_link_register_cubit.dart';
import 'cubit/tournament_invite_link_register_state.dart';

/// Public screen the deep link / `/invite/:token` landing resolves to
/// (REQ-TIL-007/008/011/012).
///
/// `TournamentInviteLinkRepository`/`TournamentInviteLinkApi` are not wired
/// into `service_locator.dart` yet (out of this task's allowed edit
/// surface) — built inline from `getIt<ApiClient>()`, same shape
/// `MatchDetailScreen` uses for its own repositories.
///
/// Whether the caller is authenticated is resolved synchronously from
/// `AuthRepository.tokensInMemory` (the same source `AuthTokenInterceptor`
/// reads to attach `Authorization` on every request) — no extra network
/// round trip needed just to decide which branch of the cubit to build.
final class TournamentInviteLinkRegisterScreen extends StatelessWidget {
  const TournamentInviteLinkRegisterScreen({super.key, required this.token});

  final String token;

  @override
  Widget build(BuildContext context) {
    final accessToken = getIt<AuthRepository>().tokensInMemory?.accessToken;
    final isAuthenticated = accessToken != null && accessToken.isNotEmpty;

    return BlocProvider<TournamentInviteLinkRegisterCubit>(
      create: (_) => TournamentInviteLinkRegisterCubit(
        tournamentInviteLinkRepository: TournamentInviteLinkRepository(
          tournamentInviteLinkApi: DioTournamentInviteLinkApi(
            apiClient: getIt<ApiClient>(),
          ),
        ),
        token: token,
        isAuthenticated: isAuthenticated,
      )..loadPreview(),
      child: const TournamentInviteLinkRegisterBody(),
    );
  }
}

/// Pure UI for [TournamentInviteLinkRegisterScreen], reading the cubit
/// already provided above it in the widget tree — testable via
/// `BlocProvider.value` with a mocked cubit, same split
/// `TournamentDetailBody` uses.
final class TournamentInviteLinkRegisterBody extends StatefulWidget {
  const TournamentInviteLinkRegisterBody({super.key});

  @override
  State<TournamentInviteLinkRegisterBody> createState() =>
      _TournamentInviteLinkRegisterBodyState();
}

final class _TournamentInviteLinkRegisterBodyState
    extends State<TournamentInviteLinkRegisterBody> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _submitGuestSV(BuildContext context) {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    if (name.length < 2 || !email.contains('@')) return;

    context.read<TournamentInviteLinkRegisterCubit>().register(
      name: name,
      phone: _phoneController.text.trim().isEmpty
          ? null
          : _phoneController.text.trim(),
      email: email,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('tournamentInviteLinkRegister.screen'),
      appBar: AppBar(title: const Text('Invitación al torneo')),
      body: SafeArea(
        child:
            BlocBuilder<
              TournamentInviteLinkRegisterCubit,
              TournamentInviteLinkRegisterState
            >(
              builder: (context, state) {
                if (state is TournamentInviteLinkRegisterInitial ||
                    state is TournamentInviteLinkRegisterLoadingPreview) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state is TournamentInviteLinkRegisterInvalid) {
                  return _InvalidView(
                    reason: state.reason,
                    message: state.message,
                  );
                }

                final loaded =
                    state as TournamentInviteLinkRegisterPreviewLoaded;

                // REQ-TIL-012: the preview endpoint never throws for a
                // closed tournament, it only reflects it via
                // `acceptsRegistration` — surfaced here as its own reason,
                // distinct from the four backend-thrown ones.
                if (!loaded.preview.acceptsRegistration &&
                    !loaded.isRegistered) {
                  return const _InvalidView(
                    reason: 'CLOSED',
                    message: 'Este torneo ya cerró la inscripción.',
                  );
                }

                if (loaded.isRegistered) {
                  return _SuccessView(result: loaded.result!);
                }

                return _PreviewForm(
                  state: loaded,
                  nameController: _nameController,
                  phoneController: _phoneController,
                  emailController: _emailController,
                  onConfirmAuthenticated: () => context
                      .read<TournamentInviteLinkRegisterCubit>()
                      .register(),
                  onSubmitGuest: () => _submitGuestSV(context),
                );
              },
            ),
      ),
    );
  }
}

/// REQ-TIL-012's "mensaje específico según el motivo (expirado / revocado /
/// agotado / torneo cerrado)" — never a generic error.
final class _InvalidView extends StatelessWidget {
  const _InvalidView({required this.reason, required this.message});

  final String reason;
  final String message;

  String _titleFor() {
    switch (reason) {
      case 'EXPIRED':
        return 'Link vencido';
      case 'REVOKED':
        return 'Link revocado';
      case 'EXHAUSTED':
        return 'Cupos del link agotados';
      case 'CLOSED':
        return 'Torneo cerrado';
      case 'NOT_FOUND':
        return 'Torneo no encontrado';
      default:
        return 'No se pudo abrir la invitación';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          key: Key('tournamentInviteLinkRegister.invalid.$reason'),
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _titleFor(),
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

final class _SuccessView extends StatelessWidget {
  const _SuccessView({required this.result});

  final TournamentInviteLinkRegistrationResultDto result;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          key: const Key('tournamentInviteLinkRegister.success'),
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '¡Listo!',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            const Text(
              'Tu inscripción queda pendiente, igual que el resto del roster.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

final class _PreviewForm extends StatelessWidget {
  const _PreviewForm({
    required this.state,
    required this.nameController,
    required this.phoneController,
    required this.emailController,
    required this.onConfirmAuthenticated,
    required this.onSubmitGuest,
  });

  final TournamentInviteLinkRegisterPreviewLoaded state;
  final TextEditingController nameController;
  final TextEditingController phoneController;
  final TextEditingController emailController;
  final VoidCallback onConfirmAuthenticated;
  final VoidCallback onSubmitGuest;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final preview = state.preview;
    final busy = state.registering;
    final error = state.registerError;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: [
        _PreviewCard(preview: preview),
        const SizedBox(height: 18),
        if (state.isAuthenticated) ...[
          Text(
            'Ya tenés sesión iniciada: solo confirmá tu inscripción.',
            style: TextStyle(color: scheme.onSurfaceVariant, height: 1.4),
          ),
          const SizedBox(height: 14),
          if (error != null) ...[
            Text(
              error,
              key: const Key('tournamentInviteLinkRegister.error'),
              style: TextStyle(color: scheme.error),
            ),
            const SizedBox(height: 10),
          ],
          FilledButton.icon(
            key: const Key('tournamentInviteLinkRegister.confirmButton'),
            onPressed: busy ? null : onConfirmAuthenticated,
            icon: busy
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.check),
            label: const Text('Confirmar inscripción'),
          ),
        ] else ...[
          Text(
            'Completá tus datos para inscribirte',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          TextField(
            key: const Key('tournamentInviteLinkRegister.name'),
            controller: nameController,
            decoration: const InputDecoration(hintText: 'Nombre y apellido *'),
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 10),
          TextField(
            key: const Key('tournamentInviteLinkRegister.phone'),
            controller: phoneController,
            decoration: const InputDecoration(
              hintText: 'Teléfono (opcional) +58…',
            ),
            keyboardType: TextInputType.phone,
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 10),
          TextField(
            key: const Key('tournamentInviteLinkRegister.email'),
            controller: emailController,
            decoration: const InputDecoration(hintText: 'Email *'),
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
          ),
          if (error != null) ...[
            const SizedBox(height: 10),
            Text(
              error,
              key: const Key('tournamentInviteLinkRegister.error'),
              style: TextStyle(color: scheme.error),
            ),
          ],
          const SizedBox(height: 18),
          FilledButton.icon(
            key: const Key('tournamentInviteLinkRegister.submit'),
            onPressed: busy ? null : onSubmitGuest,
            icon: busy
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.how_to_reg),
            label: const Text('Inscribirme'),
          ),
        ],
      ],
    );
  }
}

final class _PreviewCard extends StatelessWidget {
  const _PreviewCard({required this.preview});

  final TournamentInviteLinkPreviewDto preview;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final startsAt = preview.startsAt;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            preview.tournamentName,
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text(
            '${preview.sportName} · ${preview.categoryName}',
            style: TextStyle(color: scheme.onSurfaceVariant),
          ),
          if (preview.venueName != null) ...[
            const SizedBox(height: 4),
            Text(
              preview.venueName!,
              style: TextStyle(color: scheme.onSurfaceVariant),
            ),
          ],
          if (startsAt != null) ...[
            const SizedBox(height: 4),
            Text(
              'Empieza el ${DateFormat('dd/MM/yyyy HH:mm').format(startsAt)}',
              style: TextStyle(color: scheme.onSurfaceVariant),
            ),
          ],
        ],
      ),
    );
  }
}
