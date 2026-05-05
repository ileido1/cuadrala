import '../failures/app_failure.dart';

Map<String, Object?> decodeEnvelopeDataMap(Map<String, Object?> json) {
  final data = json['data'];
  if (data is Map<String, Object?>) {
    return data;
  }
  throw const AppFailure(
    code: 'INVALID_RESPONSE',
    message: 'Respuesta inválida del servidor.',
  );
}
