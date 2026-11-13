import 'package:cuadrala_mobile/src/core/push/notification_destination.dart';
import 'package:cuadrala_mobile/src/features/notifications/data/models/notification_delivery_dto.dart';
import 'package:cuadrala_mobile/src/router/routes.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> _deliveryJson(String type, {String? matchId}) => {
  'deliveryId': 'd-1',
  'createdAt': '2026-11-13T12:00:00.000Z',
  'readAt': null,
  'event': {'type': type, 'matchId': ?matchId},
};

void main() {
  //? S9: recordatorio para cargar el resultado cuando terminó el bloque y
  //? nadie lo cargó. Se lista con texto propio y abre la carga del resultado.
  group('MATCH_RESULT_REMINDER', () {
    test('should parse the type and its default copy', () {
      final dto = NotificationDeliveryDto.fromJson(
        _deliveryJson('MATCH_RESULT_REMINDER', matchId: 'm-1'),
      );

      expect(dto.type, NotificationType.matchResultReminder);
      expect(dto.type.wire, 'MATCH_RESULT_REMINDER');
      expect(dto.title, '¿Cómo salió la partida?');
      expect(dto.body, 'Cargá el resultado de tu partida.');
      expect(dto.deepLink, '/matches/m-1');
    });

    test('should open the result entry when tapped from the in-app list', () {
      final dto = NotificationDeliveryDto.fromJson(
        _deliveryJson('MATCH_RESULT_REMINDER', matchId: 'm-1'),
      );

      //? Mismo cálculo que hace `notifications_screen.dart` al tocar la fila.
      final destination = notificationDestinationFromDeepLink(
        dto.deepLink,
        eventType: dto.type.wire,
      );

      expect(destination?.route, Routes.matchResult('m-1'));
    });
  });

  //? El texto por defecto de los tipos existentes no cambia (se comparte con
  //? el banner de foreground desde S9).
  test('should keep the default copy of the existing types', () {
    const expected = <String, (String, String)>{
      'CHAT_MESSAGE': (
        'Nuevo mensaje',
        'Tienes un nuevo mensaje en el chat de la partida.',
      ),
      'MATCH_SLOT_OPENED': (
        'Se abrió una vacante',
        'Hay una vacante en una partida que coincide con tus preferencias.',
      ),
      'MATCH_CANCELLED': ('Partida cancelada', 'Una partida fue cancelada.'),
      'PAYMENT_PENDING': (
        'Pago pendiente',
        'Hay un pago pendiente de revisión en tu partida.',
      ),
      'MATCH_PLAYER_JOINED': ('Nuevo jugador', 'Alguien se unió a tu partida.'),
      'PAYMENT_CONFIRMED': (
        'Pago confirmado',
        'Tu pago fue confirmado por el club.',
      ),
      'TOURNAMENT_REGISTRATION_RECEIVED': (
        'Nueva inscripción',
        'Alguien se anotó a tu torneo y espera tu confirmación.',
      ),
      'TOURNAMENT_REGISTRATION_CONFIRMED': (
        'Estás dentro',
        'El organizador confirmó tu inscripción al torneo.',
      ),
      'TOURNAMENT_SCHEDULE_PUBLISHED': (
        'Ya está el calendario',
        'Se publicó el calendario del torneo. Mirá cuándo te toca jugar.',
      ),
      'TOURNAMENT_STARTED': (
        'Arrancó el torneo',
        'Tu torneo comenzó. Seguí los resultados y la tabla desde la app.',
      ),
      'TOURNAMENT_MATCH_NEEDS_ATTENTION': (
        'Un partido necesita horario',
        'Un partido de tu torneo se quedó sin cancha. Reubicalo desde el calendario.',
      ),
      'QUICK_MATCH_PROPOSAL': (
        'Encontramos una partida',
        'Tenés una propuesta lista para confirmar.',
      ),
    };

    for (final entry in expected.entries) {
      final dto = NotificationDeliveryDto.fromJson(_deliveryJson(entry.key));
      expect(dto.title, entry.value.$1, reason: entry.key);
      expect(dto.body, entry.value.$2, reason: entry.key);
      expect(notificationDefaultTitle(dto.type), entry.value.$1);
      expect(notificationDefaultBody(dto.type), entry.value.$2);
    }
  });
}
