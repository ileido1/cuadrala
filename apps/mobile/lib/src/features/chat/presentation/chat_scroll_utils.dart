import 'package:flutter/material.dart';

void scrollChatToBottom(ScrollController scroll) {
  if (!scroll.hasClients) return;
  scroll.animateTo(
    scroll.position.maxScrollExtent,
    duration: const Duration(milliseconds: 200),
    curve: Curves.easeOut,
  );
}
