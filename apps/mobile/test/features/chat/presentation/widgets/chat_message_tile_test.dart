import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/chat/data/models/chat_message_dto.dart';
import 'package:cuadrala_mobile/src/features/chat/presentation/widgets/chat_message_tile.dart';

void main() {
  group('ChatMessageTile', () {
    testWidgets('renderiza texto y timestamp', (tester) async {
      final msg = ChatMessageDto(
        id: 'm1',
        threadId: 't1',
        authorUserId: 'u1',
        senderDisplayName: 'Jugador',
        text: 'Mensaje de prueba',
        createdAt: DateTime(2026, 5, 11, 15, 30),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ChatMessageTile(message: msg, viewerUserId: 'u2'),
          ),
        ),
      );

      expect(find.text('Mensaje de prueba'), findsOneWidget);
      expect(find.text('Jugador'), findsOneWidget);
      expect(find.textContaining('15:30'), findsOneWidget);
    });

    testWidgets('mensaje propio alineado a la derecha sin nombre', (tester) async {
      final msg = ChatMessageDto(
        id: 'm1',
        threadId: 't1',
        authorUserId: 'u1',
        senderDisplayName: 'Yo',
        text: 'Msg',
        createdAt: DateTime(2026, 5, 11, 15, 30),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ChatMessageTile(message: msg, viewerUserId: 'u1'),
          ),
        ),
      );

      expect(find.text('Yo'), findsNothing);
      expect(find.text('Msg'), findsOneWidget);
    });
  });
}