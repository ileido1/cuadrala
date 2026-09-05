import '../../features/notifications/data/models/notification_delivery_dto.dart';
import '../../router/routes.dart';

/// A dónde lleva tocar una notificación.
///
/// La decisión vivía copiada en cuatro lugares —el navegador de push, el
/// handler de foreground, la bandeja in-app y el parseo del DTO— y los cuatro
/// leían solo `matchId`. Cuando el evento pasó a poder tener un torneo como
/// sujeto, las notificaciones de torneo caían al listado de avisos sin llevar a
/// ningún lado. Con una sola función, agregar un sujeto nuevo se hace una vez.
class NotificationDestination {
  const NotificationDestination(this.route, {this.replacesStack = false});

  /// Ruta a abrir.
  final String route;

  /// `true` cuando es un destino de descarte (el listado de avisos) y conviene
  /// reemplazar la pila en vez de apilar una pantalla más.
  final bool replacesStack;
}

const _fallback = NotificationDestination(Routes.avisos, replacesStack: true);

/// Resuelve el destino a partir del tipo de evento y su sujeto.
NotificationDestination notificationDestination({
  required String eventType,
  required String? matchId,
  required String? tournamentId,
}) {
  //? Los de torneo se resuelven por el sujeto y no por el tipo: los cuatro van
  //? a la misma pantalla, y una quinta notificación de torneo va a querer lo
  //? mismo sin tener que tocar esta lista.
  if (tournamentId != null && tournamentId.isNotEmpty) {
    return NotificationDestination(Routes.tournamentDetail(tournamentId));
  }

  if (matchId == null || matchId.isEmpty) return _fallback;

  return switch (notificationTypeFromWire(eventType)) {
    NotificationType.chatMessage => NotificationDestination(Routes.matchChat(matchId)),
    //? `matchCancelled` estaba solo en la copia del handler de foreground: por
    //? push desde background, una partida cancelada caía al listado de avisos.
    //? Al unificar se toma el comportamiento más útil de las dos copias.
    NotificationType.matchPlayerJoined ||
    NotificationType.paymentConfirmed ||
    NotificationType.paymentPending ||
    NotificationType.matchCancelled =>
      NotificationDestination(Routes.matchDetail(matchId)),
    _ => _fallback,
  };
}

/// Resuelve el destino a partir del `deepLink` que arma la API.
///
/// Devuelve `null` cuando el link no se reconoce, para que quien llama decida
/// si cae al listado o ignora el toque.
NotificationDestination? notificationDestinationFromDeepLink(
  String? deepLink, {
  required String eventType,
}) {
  if (deepLink == null) return null;

  final tournamentId = _idAfter(deepLink, '/tournaments/');
  if (tournamentId != null) {
    return notificationDestination(
      eventType: eventType,
      matchId: null,
      tournamentId: tournamentId,
    );
  }

  final matchId = _idAfter(deepLink, '/matches/');
  if (matchId != null) {
    return notificationDestination(
      eventType: eventType,
      matchId: matchId,
      tournamentId: null,
    );
  }

  return null;
}

String? _idAfter(String link, String prefix) {
  if (!link.startsWith(prefix)) return null;
  final id = link.substring(prefix.length).split('/').first;
  return id.isEmpty ? null : id;
}
