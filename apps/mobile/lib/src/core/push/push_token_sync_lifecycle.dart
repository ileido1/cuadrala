import 'package:flutter/widgets.dart';

import '../di/service_locator.dart';
import 'push_token_sync_service.dart';

/// Reintenta registrar FCM al volver a primer plano (p. ej. tras conceder permisos).
final class PushTokenSyncLifecycle extends StatefulWidget {
  const PushTokenSyncLifecycle({required this.child, super.key});

  final Widget child;

  @override
  State<PushTokenSyncLifecycle> createState() => _PushTokenSyncLifecycleState();
}

class _PushTokenSyncLifecycleState extends State<PushTokenSyncLifecycle>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      getIt<PushTokenSyncService>().syncTokenIfAuthenticated();
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
