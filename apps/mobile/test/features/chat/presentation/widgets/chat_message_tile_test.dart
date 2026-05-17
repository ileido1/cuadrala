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
        text: 'Mensaje de prueba',
        createdAt: DateTime(2026, 5, 11, 15, 30),
      );

      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: ChatMessageTile(message: msg))),
      );

      expect(find.text('Mensaje de prueba'), findsOneWidget);
      // Timestamp: verify time is shown (15:30)
      expect(find.textContaining('15:30'), findsOneWidget);
    });

    testWidgets('renderiza fecha MAÑANA cuando corresponde', (tester) async {
      final tomorrow = DateTime.now().add(const Duration(days: 1));
      final msg = ChatMessageDto(
        id: 'm1',
        threadId: 't1',
        authorUserId: 'u1',
        text: 'Msg',
        createdAt: tomorrow,
      );

      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: ChatMessageTile(message: msg))),
      );

      expect(find.textContaining('MAÑANA'), findsOneWidget);
    });
  });
}