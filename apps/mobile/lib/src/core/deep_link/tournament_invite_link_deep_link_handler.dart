import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:go_router/go_router.dart';

import '../../router/routes.dart';

/// Dominio universal del link de invitación (issue #47, REQ-TIL-011).
///
/// TODO(issue-47): todavía no hay un dominio real de producción definido —
/// `PUBLIC_WEB_URL` en el backend (`services/api/src/config/env.ts`) por
/// ahora solo tiene el default `http://localhost:3000`. Este placeholder
/// debe reemplazarse por el dominio real de `apps/web` (y mantenerse en
/// sincronía con el `intent-filter` de Android y las Associated Domains de
/// iOS) en cuanto el usuario lo defina.
const String kTournamentInviteLinkHost = 'cuadrala.app';

/// Extrae el token de un [Uri] de invitación (`https://<host>/invite/<token>`).
///
/// Pura y sin efectos secundarios: no navega, no lanza. Devuelve `null` ante
/// cualquier forma inesperada (host distinto, sin segmento de token,
/// segmentos extra, token vacío) en vez de lanzar, para que el caller pueda
/// simplemente ignorar el evento de deep link sin manejar excepciones.
String? extractInviteTokenFromUri(Uri uri) {
  if (uri.host != kTournamentInviteLinkHost) return null;
  if (uri.pathSegments.length != 2) return null;
  if (uri.pathSegments[0] != 'invite') return null;

  final token = uri.pathSegments[1];
  if (token.isEmpty) return null;

  return token;
}

/// Enlaza la apertura de links de invitación con [GoRouter] (llamar tras
/// crear el router, mismo patrón que `setupPushNotificationTapHandler`).
///
/// Cubre cold-start (app abierta desde el link, `getInitialLink`) y el caso
/// en caliente (app ya corriendo, `uriLinkStream`).
void setupTournamentInviteLinkDeepLinkHandler(GoRouter router) {
  if (kIsWeb) return;

  final appLinks = AppLinks();

  appLinks.uriLinkStream.listen((uri) {
    final token = extractInviteTokenFromUri(uri);
    if (token == null) return;
    router.go(Routes.tournamentInviteLinkRegister(token));
  });

  appLinks.getInitialLink().then((uri) {
    if (uri == null) return;
    final token = extractInviteTokenFromUri(uri);
    if (token == null) return;
    router.go(Routes.tournamentInviteLinkRegister(token));
  });
}
