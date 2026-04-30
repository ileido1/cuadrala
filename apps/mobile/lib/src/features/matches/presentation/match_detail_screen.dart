import 'package:flutter/material.dart';

final class MatchDetailScreen extends StatelessWidget {
  const MatchDetailScreen({super.key, required this.matchId});

  final String matchId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('match.detail'),
      appBar: AppBar(title: const Text('Detalle de partida')),
      body: Center(child: Text('Match: $matchId')),
    );
  }
}

