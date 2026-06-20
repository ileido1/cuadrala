import 'package:flutter/material.dart';

import '../../../../core/theme/app_icons.dart';
import '../cubit/result_entry_state.dart';

// ---------------------------------------------------------------------------
// CourtAssignmentWidget
//
// Pure-presentation drag-and-drop court layout. Accepts callbacks instead of
// accessing ResultEntryCubit directly, so it can be reused in any screen.
//
// [participants] — ordered list of user IDs. These are the draggable data
//   values passed to [onAssign].
// [displayNames] — optional map from userId → displayName. When absent,
//   the userId string is shown as the display name.
// [courtPositions] — current assignments: CourtPosition → userId.
// [onAssign] — called with (CourtPosition, userId) when a user is dropped.
// [onRemove] — called with CourtPosition when an assigned user is dragged out.
// ---------------------------------------------------------------------------

class CourtAssignmentWidget extends StatelessWidget {
  const CourtAssignmentWidget({
    super.key,
    required this.participants,
    this.displayNames = const {},
    required this.courtPositions,
    required this.onAssign,
    required this.onRemove,
  });

  final List<String> participants;
  final Map<String, String> displayNames;
  final Map<CourtPosition, String> courtPositions;
  final void Function(CourtPosition position, String userId) onAssign;
  final void Function(CourtPosition position) onRemove;

  String _displayFor(String userId) => displayNames[userId] ?? userId;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        _CourtLayout(
          courtPositions: courtPositions,
          participants: participants,
          displayNames: displayNames,
          onAssign: onAssign,
          onRemove: onRemove,
        ),
        const SizedBox(height: 10),
        Text(
          'Sin asignar',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 6),
        _UnassignedPool(
          participants: participants,
          displayNames: displayNames,
          courtPositions: courtPositions,
          displayFor: _displayFor,
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// _CourtLayout — net + two team halves
// ---------------------------------------------------------------------------

class _CourtLayout extends StatelessWidget {
  const _CourtLayout({
    required this.courtPositions,
    required this.participants,
    required this.displayNames,
    required this.onAssign,
    required this.onRemove,
  });

  final Map<CourtPosition, String> courtPositions;
  final List<String> participants;
  final Map<String, String> displayNames;
  final void Function(CourtPosition, String) onAssign;
  final void Function(CourtPosition) onRemove;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _TeamHalf(
            team: 'A',
            teamColor: scheme.primary,
            positions: const [
              CourtPosition.teamADrive,
              CourtPosition.teamAReves,
            ],
            courtPositions: courtPositions,
            displayNames: displayNames,
            onAssign: onAssign,
            onRemove: onRemove,
          ),
          const _NetDivider(),
          _TeamHalf(
            team: 'B',
            teamColor: scheme.tertiary,
            positions: const [
              CourtPosition.teamBDrive,
              CourtPosition.teamBReves,
            ],
            courtPositions: courtPositions,
            displayNames: displayNames,
            onAssign: onAssign,
            onRemove: onRemove,
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _TeamHalf — label + row of two court zones
// ---------------------------------------------------------------------------

class _TeamHalf extends StatelessWidget {
  const _TeamHalf({
    required this.team,
    required this.teamColor,
    required this.positions,
    required this.courtPositions,
    required this.displayNames,
    required this.onAssign,
    required this.onRemove,
  });

  final String team;
  final Color teamColor;
  final List<CourtPosition> positions;
  final Map<CourtPosition, String> courtPositions;
  final Map<String, String> displayNames;
  final void Function(CourtPosition, String) onAssign;
  final void Function(CourtPosition) onRemove;

  static String _labelFor(CourtPosition pos) {
    return switch (pos) {
      CourtPosition.teamADrive || CourtPosition.teamBDrive => 'Drive',
      CourtPosition.teamAReves || CourtPosition.teamBReves => 'Revés',
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Equipo $team',
          style: theme.textTheme.labelSmall?.copyWith(color: teamColor),
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            _CourtZone(
              position: positions[0],
              label: _labelFor(positions[0]),
              teamColor: teamColor,
              courtPositions: courtPositions,
              displayNames: displayNames,
              onAssign: onAssign,
              onRemove: onRemove,
            ),
            const SizedBox(width: 8),
            _CourtZone(
              position: positions[1],
              label: _labelFor(positions[1]),
              teamColor: teamColor,
              courtPositions: courtPositions,
              displayNames: displayNames,
              onAssign: onAssign,
              onRemove: onRemove,
            ),
          ],
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// _NetDivider
// ---------------------------------------------------------------------------

class _NetDivider extends StatelessWidget {
  const _NetDivider();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          const Expanded(
            child: Divider(color: Colors.white, thickness: 2),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              'RED',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
          const Expanded(
            child: Divider(color: Colors.white, thickness: 2),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _CourtZone — single drag-target slot
// ---------------------------------------------------------------------------

class _CourtZone extends StatelessWidget {
  const _CourtZone({
    required this.position,
    required this.label,
    required this.teamColor,
    required this.courtPositions,
    required this.displayNames,
    required this.onAssign,
    required this.onRemove,
  });

  final CourtPosition position;
  final String label;
  final Color teamColor;
  final Map<CourtPosition, String> courtPositions;
  final Map<String, String> displayNames;
  final void Function(CourtPosition, String) onAssign;
  final void Function(CourtPosition) onRemove;

  @override
  Widget build(BuildContext context) {
    final occupiedUserId = courtPositions[position];
    final displayName = occupiedUserId != null
        ? (displayNames[occupiedUserId] ?? occupiedUserId)
        : null;

    return Expanded(
      child: SizedBox(
        height: 88,
        child: DragTarget<String>(
          onWillAcceptWithDetails: (details) =>
              !courtPositions.containsKey(position),
          onAcceptWithDetails: (details) {
            onAssign(position, details.data);
          },
          builder: (context, candidateData, rejectedData) {
            final isHighlighted = candidateData.isNotEmpty;

            final decoration = BoxDecoration(
              color: isHighlighted
                  ? teamColor.withValues(alpha: 0.15)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isHighlighted
                    ? teamColor
                    : teamColor.withValues(alpha: 0.5),
                width: isHighlighted ? 2 : 1.5,
              ),
            );

            if (occupiedUserId != null && displayName != null) {
              return Draggable<String>(
                data: occupiedUserId,
                onDragCompleted: () {
                  onRemove(position);
                },
                feedback: Material(
                  elevation: 4,
                  borderRadius: BorderRadius.circular(12),
                  child: _PlayerChip(
                    displayName: displayName,
                    accentColor: teamColor,
                  ),
                ),
                childWhenDragging: Container(
                  decoration: BoxDecoration(
                    color: teamColor.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: teamColor.withValues(alpha: 0.2),
                      width: 1.5,
                    ),
                  ),
                ),
                child: Container(
                  decoration: decoration.copyWith(
                    color: teamColor.withValues(alpha: 0.15),
                    border: Border.all(color: teamColor, width: 1.5),
                  ),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 16,
                        backgroundColor: teamColor,
                        child: Text(
                          _initials(displayName),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          displayName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

            return Container(
              decoration: decoration,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    AppIcons.personAdd,
                    color: teamColor.withValues(alpha: 0.5),
                    size: 20,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 12,
                      color: teamColor.withValues(alpha: 0.7),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _UnassignedPool — horizontally scrollable row of draggable player chips
// ---------------------------------------------------------------------------

String _initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+'));
  if (parts.length >= 2 && parts[1].isNotEmpty) {
    return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
  }
  return parts[0].isNotEmpty ? parts[0][0].toUpperCase() : '?';
}

class _UnassignedPool extends StatelessWidget {
  const _UnassignedPool({
    required this.participants,
    required this.displayNames,
    required this.courtPositions,
    required this.displayFor,
  });

  final List<String> participants;
  final Map<String, String> displayNames;
  final Map<CourtPosition, String> courtPositions;
  final String Function(String userId) displayFor;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final assignedIds = courtPositions.values.toSet();
    final unassigned =
        participants.where((uid) => !assignedIds.contains(uid)).toList();

    if (unassigned.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(AppIcons.checkCircle, color: scheme.primary, size: 16),
            const SizedBox(width: 6),
            Text(
              'Todos asignados',
              style: TextStyle(
                color: scheme.primary,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: unassigned.map((uid) {
          final name = displayFor(uid);
          final initials = _initials(name);
          final firstName = name.split(' ').first;
          final avatar = CircleAvatar(
            radius: 22,
            backgroundColor: scheme.primaryContainer,
            child: Text(
              initials,
              style: TextStyle(
                color: scheme.onPrimaryContainer,
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
          );
          final labelWidget = SizedBox(
            width: 64,
            child: Text(
              firstName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style:
                  const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
          );
          final chip = Column(
            mainAxisSize: MainAxisSize.min,
            children: [avatar, const SizedBox(height: 4), labelWidget],
          );
          return Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Draggable<String>(
              data: uid,
              feedback: Material(
                elevation: 6,
                shape: const CircleBorder(),
                child: CircleAvatar(
                  radius: 26,
                  backgroundColor: scheme.primary,
                  child: Text(
                    initials,
                    style: TextStyle(
                      color: scheme.onPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              childWhenDragging: Opacity(opacity: 0.3, child: chip),
              child: chip,
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _PlayerChip — drag feedback chip with accent color
// ---------------------------------------------------------------------------

class _PlayerChip extends StatelessWidget {
  const _PlayerChip({required this.displayName, this.accentColor});

  final String displayName;
  final Color? accentColor;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final color = accentColor;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: color != null
              ? color.withValues(alpha: 0.4)
              : scheme.outline.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (color != null) ...[
            CircleAvatar(
              radius: 10,
              backgroundColor: color,
              child: Text(
                displayName.isNotEmpty ? displayName[0].toUpperCase() : '?',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 6),
          ],
          Text(
            displayName,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
