import 'dart:typed_data';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../../core/formatting/fx_price_labels.dart';
import '../../data/monetization_repository.dart';
import 'upload_receipt_state.dart';

final class UploadReceiptCubit extends Cubit<UploadReceiptState> {
  UploadReceiptCubit({
    required MonetizationRepository monetizationRepository,
    required String transactionId,
  })  : _monetizationRepository = monetizationRepository,
        _transactionId = transactionId,
        super(const UploadReceiptState());

  final MonetizationRepository _monetizationRepository;
  final String _transactionId;

  Future<void> loadExchangeRates() async {
    final rates = await loadExchangeRatesSafelySV();
    emit(state.copyWith(exchangeRates: rates));
  }

  Future<void> pickImage() async {
    final picker = ImagePicker();
    final xfile = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 2048,
      imageQuality: 85,
    );
    if (xfile == null) return;
    final bytes = await xfile.readAsBytes();
    setImage(bytes: bytes, fileName: xfile.name.trim());
  }

  void setImage({required Uint8List bytes, required String fileName}) {
    emit(state.copyWith(
      imageBytes: bytes,
      fileName: fileName.isNotEmpty ? fileName : 'receipt.jpg',
    ));
  }

  Future<void> upload() async {
    final bytes = state.imageBytes;
    if (bytes == null) return;

    emit(UploadReceiptState(
      imageBytes: bytes,
      fileName: state.fileName,
      uploading: true,
      exchangeRates: state.exchangeRates,
    ));
    try {
      await _monetizationRepository.uploadReceipt(
        transactionId: _transactionId,
        fileBytes: bytes,
        fileName: state.fileName,
      );
      emit(UploadReceiptState(
        imageBytes: bytes,
        fileName: state.fileName,
        exchangeRates: state.exchangeRates,
        completed: true,
      ));
    } catch (e) {
      final message = e is AppFailure
          ? e.message
          : 'No se pudo subir el comprobante.';
      emit(UploadReceiptState(
        imageBytes: bytes,
        fileName: state.fileName,
        exchangeRates: state.exchangeRates,
        errorMessage: message,
      ));
    }
  }
}
