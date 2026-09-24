import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/quick_match/data/quick_match_api.dart';
import 'package:cuadrala_mobile/src/features/quick_match/data/quick_match_repository.dart';

class _QuickMatchApiStub implements QuickMatchApi {
  _QuickMatchApiStub(this.currentResponse);

  final Map<String, Object?>? currentResponse;

  @override
  Future<Map<String, Object?>?> getCurrent() async => currentResponse;

  @override
  Future<Map<String, Object?>> start(Map<String, Object?> body) =>
      throw UnimplementedError();

  @override
  Future<Map<String, Object?>> confirmProposal({
    Map<String, Object?> body = const {},
  }) => throw UnimplementedError();

  @override
  Future<Map<String, Object?>> dismissProposal() => throw UnimplementedError();

  @override
  Future<void> cancel() => throw UnimplementedError();
}

void main() {
  test('current devuelve null cuando la API responde data null', () async {
    final repository = QuickMatchRepository(_QuickMatchApiStub(null));

    expect(await repository.current(), isNull);
  });
}
