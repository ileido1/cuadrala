import 'package:flutter/material.dart';

final class TournamentDetailScreen extends StatelessWidget {
  const TournamentDetailScreen({super.key, required this.tournamentId});

  final String tournamentId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('tournament.detail'),
      appBar: AppBar(title: const Text('Detalle de torneo')),
      body: Center(child: Text('Torneo: $tournamentId')),
    );
  }
}

