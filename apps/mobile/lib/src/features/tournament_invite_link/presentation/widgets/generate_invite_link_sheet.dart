import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/theme/app_icons.dart';
import '../cubit/tournament_invite_links_cubit.dart';
import '../cubit/tournament_invite_links_state.dart';

/// Organizer-only bottom sheet to generate a shareable invite link
/// (REQ-TIL-001), parallel to `invite_guest_sheet.dart`'s `InviteGuestSheet`.
///
/// Submits via [TournamentInviteLinksCubit.generate] with no overrides — the
/// default expiration/uses the backend resolves per REQ-TIL-003/004 — and
/// shows the raw token/url exactly once with a "Compartir" action, since the
/// backend never returns the raw token again (REQ-TIL-002).
final class GenerateInviteLinkSheet extends StatelessWidget {
  const GenerateInviteLinkSheet({super.key});

  void _generate(BuildContext context) {
    context.read<TournamentInviteLinksCubit>().generate();
  }

  void _share(BuildContext context, String shareText) {
    Clipboard.setData(ClipboardData(text: shareText));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Link copiado. Pegalo en WhatsApp o donde quieras.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
        child:
            BlocBuilder<TournamentInviteLinksCubit, TournamentInviteLinksState>(
              builder: (context, state) {
                final loaded = state is TournamentInviteLinksLoaded
                    ? state
                    : null;
                final busy = loaded?.generating ?? false;
                final error = loaded?.generateError;
                final generated = loaded?.lastGeneratedLink;

                if (generated != null) {
                  final shareText =
                      generated.url ?? generated.deepLink ?? generated.token ?? '';
                  return Column(
                    key: const Key(
                      'tournament.generateInviteLinkSheet.success',
                    ),
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const _SheetHandle(),
                      Text(
                        'Link generado',
                        style: Theme.of(context).textTheme.titleLarge
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Guardalo ahora: no vas a poder verlo de nuevo',
                        style: Theme.of(context).textTheme.bodySmall
                            ?.copyWith(
                              color: Theme.of(
                                context,
                              ).colorScheme.onSurfaceVariant,
                            ),
                      ),
                      const SizedBox(height: 14),
                      SelectableText(
                        shareText,
                        key: const Key(
                          'tournament.generateInviteLinkSheet.token',
                        ),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 18),
                      FilledButton.icon(
                        key: const Key(
                          'tournament.generateInviteLinkSheet.share',
                        ),
                        onPressed: () => _share(context, shareText),
                        icon: const Icon(AppIcons.share, size: 18),
                        label: const Text('Compartir'),
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton(
                        key: const Key(
                          'tournament.generateInviteLinkSheet.done',
                        ),
                        onPressed: () => Navigator.of(context).maybePop(),
                        child: const Text('Listo'),
                      ),
                    ],
                  );
                }

                return Column(
                  key: const Key('tournament.generateInviteLinkSheet'),
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const _SheetHandle(),
                    Text(
                      'Generar link',
                      key: const Key(
                        'tournament.generateInviteLinkSheet.title',
                      ),
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Cualquiera que lo abra puede inscribirse solo',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'El link vence automáticamente y lo podés revocar cuando quieras desde esta pantalla.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        height: 1.45,
                      ),
                    ),
                    if (error != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        error,
                        key: const Key(
                          'tournament.generateInviteLinkSheet.error',
                        ),
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ],
                    const SizedBox(height: 18),
                    FilledButton.icon(
                      key: const Key(
                        'tournament.generateInviteLinkSheet.submit',
                      ),
                      onPressed: busy ? null : () => _generate(context),
                      icon: busy
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                              ),
                            )
                          : const Icon(AppIcons.share, size: 18),
                      label: const Text('Generar'),
                    ),
                  ],
                );
              },
            ),
      ),
    );
  }
}

final class _SheetHandle extends StatelessWidget {
  const _SheetHandle();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 40,
        height: 4,
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.outline,
          borderRadius: BorderRadius.circular(999),
        ),
      ),
    );
  }
}

/// Opens [GenerateInviteLinkSheet] as a modal bottom sheet, reusing the
/// [TournamentInviteLinksCubit] already provided above [context] — same
/// pattern as `showInviteGuestSheet`.
Future<void> showGenerateInviteLinkSheet(BuildContext context) {
  final cubit = context.read<TournamentInviteLinksCubit>();
  final scheme = Theme.of(context).colorScheme;
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: scheme.surfaceContainerLow,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (sheetContext) => BlocProvider.value(
      value: cubit,
      child: const GenerateInviteLinkSheet(),
    ),
  );
}
