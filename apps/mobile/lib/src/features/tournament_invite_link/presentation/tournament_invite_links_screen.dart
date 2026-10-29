import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_icons.dart';
import '../data/models/tournament_invite_link_dto.dart';
import '../data/tournament_invite_link_api.dart';
import '../data/tournament_invite_link_repository.dart';
import 'cubit/tournament_invite_links_cubit.dart';
import 'cubit/tournament_invite_links_state.dart';
import 'widgets/generate_invite_link_sheet.dart';

/// Organizer screen: list a tournament's invite links with their
/// registrants, generate new ones, and revoke active ones
/// (REQ-TIL-001/005/006). Opened from `org_registrations_tab.dart`'s
/// "Generar link" button.
///
/// `TournamentInviteLinkRepository`/`TournamentInviteLinkApi` are not wired
/// into `service_locator.dart` yet (out of this task's allowed edit
/// surface) — built inline from `getIt<ApiClient>()` instead, same shape
/// `MatchDetailScreen` uses for its own repositories.
final class TournamentInviteLinksScreen extends StatelessWidget {
  const TournamentInviteLinksScreen({super.key, required this.tournamentId});

  final String tournamentId;

  @override
  Widget build(BuildContext context) {
    return BlocProvider<TournamentInviteLinksCubit>(
      create: (_) => TournamentInviteLinksCubit(
        tournamentInviteLinkRepository: TournamentInviteLinkRepository(
          tournamentInviteLinkApi: DioTournamentInviteLinkApi(
            apiClient: getIt<ApiClient>(),
          ),
        ),
        tournamentId: tournamentId,
      )..load(),
      child: const TournamentInviteLinksBody(),
    );
  }
}

/// Pure UI for [TournamentInviteLinksScreen], reading the cubit already
/// provided above it in the widget tree — testable via `BlocProvider.value`
/// with a mocked cubit, same split `TournamentDetailBody` uses.
final class TournamentInviteLinksBody extends StatelessWidget {
  const TournamentInviteLinksBody({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('tournamentInviteLinks.screen'),
      appBar: AppBar(title: const Text('Links de invitación')),
      body:
          BlocBuilder<TournamentInviteLinksCubit, TournamentInviteLinksState>(
            builder: (context, state) {
              if (state is TournamentInviteLinksLoading ||
                  state is TournamentInviteLinksInitial) {
                return const Center(child: CircularProgressIndicator());
              }
              if (state is TournamentInviteLinksFailure) {
                return _ErrorBox(
                  message: state.message,
                  onRetry: () =>
                      context.read<TournamentInviteLinksCubit>().load(),
                );
              }

              final loaded = state as TournamentInviteLinksLoaded;
              final active = loaded.links
                  .where((link) => !link.isRevoked)
                  .toList();
              final revoked = loaded.links
                  .where((link) => link.isRevoked)
                  .toList();

              return ListView(
                key: const Key('tournamentInviteLinks.list'),
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 100),
                children: [
                  if (loaded.revokeError != null) ...[
                    _InlineError(message: loaded.revokeError!),
                    const SizedBox(height: 12),
                  ],
                  if (loaded.links.isEmpty)
                    const _EmptyBox(key: Key('tournamentInviteLinks.empty'))
                  else ...[
                    if (active.isNotEmpty) ...[
                      _SectionHeader(label: 'Activos · ${active.length}'),
                      for (final link in active)
                        _InviteLinkTile(
                          link: link,
                          busy: loaded.busyLinkId == link.id,
                          onRevoke: () => context
                              .read<TournamentInviteLinksCubit>()
                              .revoke(link.id),
                        ),
                    ],
                    if (revoked.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      _SectionHeader(label: 'Revocados · ${revoked.length}'),
                      for (final link in revoked)
                        _InviteLinkTile(link: link, busy: false, onRevoke: null),
                    ],
                  ],
                ],
              );
            },
          ),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('tournamentInviteLinks.generate'),
        onPressed: () => showGenerateInviteLinkSheet(context),
        icon: const Icon(AppIcons.add),
        label: const Text('Generar link'),
      ),
    );
  }
}

final class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: scheme.onSurfaceVariant,
          fontWeight: FontWeight.w800,
          letterSpacing: .5,
        ),
      ),
    );
  }
}

final class _InviteLinkTile extends StatelessWidget {
  const _InviteLinkTile({
    required this.link,
    required this.busy,
    required this.onRevoke,
  });

  final TournamentInviteLinkDto link;
  final bool busy;
  final VoidCallback? onRevoke;

  String _statusLabel() {
    if (link.isRevoked) return 'REVOCADO';
    if (link.isExhausted) return 'AGOTADO';
    return 'ACTIVO';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dateFormat = DateFormat('dd/MM/yyyy');
    final maxUsesLabel = link.maxUses == null
        ? '${link.usesCount} (sin límite)'
        : '${link.usesCount}/${link.maxUses}';

    return Container(
      key: Key('tournamentInviteLinks.tile.${link.id}'),
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: scheme.outlineVariant, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Usos: $maxUsesLabel',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 7,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  _statusLabel(),
                  style: const TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Vence: ${dateFormat.format(link.expiresAt)} · Creado: ${dateFormat.format(link.createdAt)}',
            style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 12.5),
          ),
          if (link.registrants.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Inscritos vía este link · ${link.registrants.length}',
              style: TextStyle(
                color: scheme.onSurfaceVariant,
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
              ),
            ),
            for (final registrant in link.registrants)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  '• ${registrant.displayName}'
                  ' (${registrant.type == 'GUEST' ? 'Sin cuenta' : 'Jugador'})',
                  key: Key(
                    'tournamentInviteLinks.registrant.${registrant.registrationId}',
                  ),
                  style: TextStyle(
                    color: scheme.onSurfaceVariant,
                    fontSize: 12.5,
                  ),
                ),
              ),
          ],
          if (onRevoke != null) ...[
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: busy
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : OutlinedButton(
                      key: Key('tournamentInviteLinks.revoke.${link.id}'),
                      onPressed: onRevoke,
                      child: const Text('Revocar'),
                    ),
            ),
          ],
        ],
      ),
    );
  }
}

final class _EmptyBox extends StatelessWidget {
  const _EmptyBox({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(14),
      ),
      child: const Text(
        'Todavía no generaste ningún link. Tocá "Generar link" para crear el primero.',
      ),
    );
  }
}

final class _InlineError extends StatelessWidget {
  const _InlineError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: scheme.errorContainer.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.error.withValues(alpha: 0.35)),
      ),
      child: Text(
        message,
        style: TextStyle(color: scheme.error, fontWeight: FontWeight.w800),
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
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: const Text('Reintentar')),
          ],
        ),
      ),
    );
  }
}
