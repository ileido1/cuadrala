import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_icons.dart';

final class AppHeader extends StatelessWidget {
  const AppHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.showBack = false,
    this.rightAction,
    this.onBack,
    this.tournamentStyle = false,
  });

  final String title;
  final String? subtitle;
  final bool showBack;
  final Widget? rightAction;
  final bool tournamentStyle;

  /// Overrides the default `context.pop()` when the back button is tapped.
  /// Screens with a fallback destination (e.g. no navigation history to pop)
  /// pass their own handler here instead of duplicating this widget.
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Material(
      color: (tournamentStyle ? scheme.surfaceContainerLow : scheme.surface)
          .withValues(alpha: 0.96),
      child: SafeArea(
        bottom: false,
        child: Container(
          height: tournamentStyle ? 66 : 56,
          padding: EdgeInsets.symmetric(horizontal: tournamentStyle ? 16 : 12),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: scheme.outlineVariant.withValues(alpha: 0.6),
              ),
            ),
          ),
          child: Row(
            children: [
              SizedBox(
                width: tournamentStyle ? 48 : 56,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: showBack
                      ? IconButton(
                          onPressed: onBack ?? () => context.pop(),
                          icon: const Icon(AppIcons.chevronLeft, size: 28),
                        )
                      : null,
                ),
              ),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: tournamentStyle
                      ? CrossAxisAlignment.start
                      : CrossAxisAlignment.center,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: tournamentStyle
                          ? TextAlign.left
                          : TextAlign.center,
                      style: TextStyle(
                        fontSize: tournamentStyle ? 17 : 16,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.2,
                      ),
                    ),
                    if (subtitle != null)
                      Text(
                        subtitle!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: tournamentStyle
                            ? TextAlign.left
                            : TextAlign.center,
                        style: TextStyle(
                          fontSize: tournamentStyle ? 12.5 : 11,
                          fontWeight: FontWeight.w600,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                  ],
                ),
              ),
              ConstrainedBox(
                constraints: BoxConstraints(
                  minWidth: tournamentStyle ? 38 : 56,
                ),
                child: rightAction ?? const SizedBox(width: 56),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
