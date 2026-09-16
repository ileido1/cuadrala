import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Guards the cross-cutting copy-fidelity rule (spec "Verbatim UI copy,
/// including spelling and accents"): the handoff consistently spells
/// "inscritos"/"inscrito" (`cuadrala-torneos.jsx:133,180,232,277,425,452`;
/// `cuadrala-torneo-org.jsx:58,255`), never "inscripto(s)". A later slice
/// reintroducing the wrong spelling would only fail here, not at compile
/// time — plain Spanish text is perfectly valid Dart.
///
/// NOTE: the spec/design literal `RegExp(r'(?i)\binscrit[oa]s?\b')` is not
/// valid Dart — Dart's `RegExp` (unlike PCRE) does not support an inline
/// `(?i)` mode modifier and throws `FormatException` on it. The equivalent
/// Dart form moves case-insensitivity to the `caseSensitive` constructor
/// argument, preserving the exact same match set.
void main() {
  test(
    'no "inscripto(s)" spelling remains under lib/src/features/tournaments',
    () {
      final root = Directory('lib/src/features/tournaments');
      final pattern = RegExp(r'\binscript[oa]s?\b', caseSensitive: false);
      final offenders = <String>[];

      for (final entity in root.listSync(recursive: true)) {
        if (entity is! File || !entity.path.endsWith('.dart')) continue;
        final content = entity.readAsStringSync();
        if (pattern.hasMatch(content)) offenders.add(entity.path);
      }

      expect(
        offenders,
        isEmpty,
        reason:
            'Handoff spelling is "inscritos"/"inscrito", never "inscripto(s)": $offenders',
      );
    },
  );
}
