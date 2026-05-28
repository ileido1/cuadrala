import 'package:flutter/material.dart';

/// Placeholder screen for venue-based match creation.
/// Full implementation will be wired in PR-4.
final class VenueMatchCreationScreen extends StatelessWidget {
  const VenueMatchCreationScreen({
    super.key,
    required this.venueId,
    this.courtId,
    this.scheduledAt,
  });

  final String venueId;
  final String? courtId;
  final String? scheduledAt;

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text('Próximamente'),
      ),
    );
  }
}
