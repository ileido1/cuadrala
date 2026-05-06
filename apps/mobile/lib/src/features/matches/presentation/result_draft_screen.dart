import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/service_locator.dart';
import '../../../core/formatting/id_preview.dart';
import '../data/matches_repository.dart';
import '../data/models/match_detail_dto.dart';

final class ResultDraftScreen extends StatefulWidget {
  const ResultDraftScreen({super.key, required this.matchId});

  final String matchId;

  @override
  State<ResultDraftScreen> createState() => _ResultDraftScreenState();
}

class _ResultDraftScreenState extends State<ResultDraftScreen> {
  bool _loading = true;
  bool _submitting = false;
  MatchDetailDto? _match;
  String? _error;
  final Map<String, int> _pointsByUserId = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final match = await getIt<MatchesRepository>().getMatchById(widget.matchId);
      for (final p in match.participants) {
        _pointsByUserId.putIfAbsent(p.userId, () => 0);
      }
      if (!mounted) return;
      setState(() {
        _match = match;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'No se pudo cargar la partida.';
        _loading = false;
      });
    }
  }

  Future<void> _submit() async {
    final match = _match;
    if (match == null) return;
    if (_pointsByUserId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No hay jugadores para cargar resultado.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final scores = _pointsByUserId.entries
          .map((e) => <String, Object?>{'userId': e.key, 'points': e.value})
          .toList();
      await getIt<MatchesRepository>().upsertResultDraft(
        matchId: widget.matchId,
        scores: scores,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Resultado enviado para confirmación.')),
      );
      context.pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No se pudo enviar el resultado: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final match = _match;
    return Scaffold(
      key: const Key('result.draft.screen'),
      appBar: AppBar(title: const Text('Cargar resultado')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: _load,
                        child: const Text('Reintentar'),
                      ),
                    ],
                  ),
                )
              : match == null
                  ? const SizedBox.shrink()
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Text(
                          'Partida ${idPreview(match.id)}',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.w900,
                              ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Puntos por jugador',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w900,
                              ),
                        ),
                        const SizedBox(height: 8),
                        ...match.participants.map((p) {
                          final points = _pointsByUserId[p.userId] ?? 0;
                          return Card(
                            child: ListTile(
                              title: Text('Usuario ${idPreview(p.userId)}'),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    onPressed: points <= 0
                                        ? null
                                        : () => setState(() {
                                              _pointsByUserId[p.userId] = points - 1;
                                            }),
                                    icon: const Icon(Icons.remove_circle_outline),
                                  ),
                                  Text(
                                    points.toString(),
                                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                          fontWeight: FontWeight.w900,
                                        ),
                                  ),
                                  IconButton(
                                    onPressed: points >= 10000
                                        ? null
                                        : () => setState(() {
                                              _pointsByUserId[p.userId] = points + 1;
                                            }),
                                    icon: const Icon(Icons.add_circle_outline),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed: _submitting ? null : _submit,
                            child: _submitting
                                ? const SizedBox(
                                    height: 18,
                                    width: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Text('Enviar propuesta'),
                          ),
                        ),
                      ],
                    ),
    );
  }
}

