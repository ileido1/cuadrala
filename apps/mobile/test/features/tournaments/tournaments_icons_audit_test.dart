import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Guards the M2 migration: every icon under the tournaments feature must go
/// through the semantic `AppIcons` catalog, never Material's raw `Icons`.
/// A later slice adding `Icon(Icons.something)` back would only fail here,
/// not at compile time — `Icons.*` is perfectly valid Dart.
void main() {
  test('no raw Icons.* reference under lib/src/features/tournaments', () {
    final root = Directory('lib/src/features/tournaments');
    final pattern = RegExp(r'(?<![A-Za-z0-9_])Icons\.');
    final offenders = <String>[];

    for (final entity in root.listSync(recursive: true)) {
      if (entity is! File || !entity.path.endsWith('.dart')) continue;
      final content = entity.readAsStringSync();
      if (pattern.hasMatch(content)) offenders.add(entity.path);
    }

    expect(offenders, isEmpty, reason: 'Migrate these files to AppIcons: $offenders');
  });
}
