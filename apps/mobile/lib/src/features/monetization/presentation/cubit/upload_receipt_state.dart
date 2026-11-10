import 'dart:typed_data';

import 'package:equatable/equatable.dart';

import '../../../../core/formatting/money_conversion.dart';

final class UploadReceiptState extends Equatable {
  const UploadReceiptState({
    this.imageBytes,
    this.fileName = 'receipt.jpg',
    this.uploading = false,
    this.exchangeRates = const [],
    this.errorMessage,
    this.completed = false,
  });

  final Uint8List? imageBytes;
  final String fileName;
  final bool uploading;
  final List<ExchangeRateRow> exchangeRates;
  final String? errorMessage;
  final bool completed;

  /// Solo para transiciones que nunca necesitan limpiar `uploading`,
  /// `errorMessage` o `completed` (selección de imagen, carga de tasas). Las
  /// transiciones del propio `upload()` construyen el estado explícito en
  /// vez de usar este `copyWith`, para no arrastrar un error viejo.
  UploadReceiptState copyWith({
    Uint8List? imageBytes,
    String? fileName,
    List<ExchangeRateRow>? exchangeRates,
  }) {
    return UploadReceiptState(
      imageBytes: imageBytes ?? this.imageBytes,
      fileName: fileName ?? this.fileName,
      uploading: uploading,
      exchangeRates: exchangeRates ?? this.exchangeRates,
      errorMessage: errorMessage,
      completed: completed,
    );
  }

  @override
  List<Object?> get props => [
        imageBytes,
        fileName,
        uploading,
        exchangeRates,
        errorMessage,
        completed,
      ];
}
