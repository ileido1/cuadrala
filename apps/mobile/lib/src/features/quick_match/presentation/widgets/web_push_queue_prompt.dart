import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../../../core/di/service_locator.dart';
import '../../../../core/push/push_token_sync_service.dart';
import '../../../../core/theme/app_icons.dart';

/// Aviso para activar las notificaciones mientras el jugador espera en la cola.
///
/// En web el push no se activa solo (el navegador exige que el permiso se pida
/// desde un toque del usuario), así que sin este aviso el jugador esperaba una
/// notificación que nunca iba a llegar. En iPhone el push web solo existe con
/// la app agregada a la pantalla de inicio desde Safari: ahí se explica cómo.
final class WebPushQueuePrompt extends StatefulWidget {
  const WebPushQueuePrompt({super.key, this.service, this.isWeb, this.isIos});

  /// Inyectables para tests; por defecto se toman de la plataforma y de getIt.
  final PushTokenSyncService? service;
  final bool? isWeb;
  final bool? isIos;

  @override
  State<WebPushQueuePrompt> createState() => _WebPushQueuePromptState();
}

enum _PromptMode { hidden, offer, denied, failed, installHint }

final class _WebPushQueuePromptState extends State<WebPushQueuePrompt> {
  _PromptMode _mode = _PromptMode.hidden;
  bool _busy = false;

  PushTokenSyncService? get _service =>
      widget.service ??
      (getIt.isRegistered<PushTokenSyncService>()
          ? getIt<PushTokenSyncService>()
          : null);

  @override
  void initState() {
    super.initState();
    _resolveMode();
  }

  Future<void> _resolveMode() async {
    final service = _service;
    final isWeb = widget.isWeb ?? kIsWeb;
    final isIos = widget.isIos ?? defaultTargetPlatform == TargetPlatform.iOS;
    if (!isWeb || service == null) return;

    //? Sin soporte de push en el navegador: en iPhone es porque la app no
    //? está instalada en la pantalla de inicio; en otros casos no hay nada
    //? que el jugador pueda hacer.
    if (!service.isWebPushAvailable) {
      if (isIos) _setMode(_PromptMode.installHint);
      return;
    }
    final enabled = await service.isWebPushEnabled();
    if (!enabled) _setMode(_PromptMode.offer);
  }

  Future<void> _enable() async {
    final service = _service;
    if (service == null || _busy) return;
    setState(() => _busy = true);
    final result = await service.enableWebPush();
    if (!mounted) return;
    setState(() => _busy = false);
    _setMode(switch (result) {
      PushEnrollmentResult.enabled => _PromptMode.hidden,
      PushEnrollmentResult.permissionDenied => _PromptMode.denied,
      PushEnrollmentResult.unavailable => _PromptMode.hidden,
      PushEnrollmentResult.failed => _PromptMode.failed,
    });
  }

  void _setMode(_PromptMode mode) {
    if (mounted) setState(() => _mode = mode);
  }

  @override
  Widget build(BuildContext context) {
    if (_mode == _PromptMode.hidden) return const SizedBox.shrink();
    final scheme = Theme.of(context).colorScheme;
    final message = switch (_mode) {
      _PromptMode.offer =>
        'Activá las notificaciones para enterarte cuando se arme tu partida, aunque no estés mirando la app.',
      _PromptMode.denied =>
        'El navegador bloqueó las notificaciones. Permitilas desde la configuración del navegador para este sitio.',
      _PromptMode.failed =>
        'No pudimos activar las notificaciones. Intentá de nuevo.',
      _PromptMode.installHint =>
        'En iPhone, para recibir avisos agregá Cuádrala a tu pantalla de inicio: en Safari, tocá Compartir y luego "Agregar a pantalla de inicio".',
      _PromptMode.hidden => '',
    };
    final showButton =
        _mode == _PromptMode.offer || _mode == _PromptMode.failed;

    return Card(
      margin: const EdgeInsets.only(top: 14),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(AppIcons.bell, size: 18, color: scheme.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(message, style: const TextStyle(fontSize: 13)),
                ),
              ],
            ),
            if (showButton) ...[
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _busy ? null : _enable,
                child: const Text('Activar notificaciones'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
