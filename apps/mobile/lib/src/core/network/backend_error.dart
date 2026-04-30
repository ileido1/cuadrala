class BackendError implements Exception {
  const BackendError({
    required this.code,
    required this.message,
    this.details,
    this.statusCode,
  });

  final String code;
  final String message;
  final Object? details;
  final int? statusCode;
}

