import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';

abstract interface class MonetizationApi {
  Future<Map<String, Object?>> createMatchObligationsEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  });

  Future<Map<String, Object?>> getMatchTransactionsSummaryEnvelope({
    required String matchId,
  });

  Future<Map<String, Object?>> confirmTransactionManualEnvelope({
    required String transactionId,
  });

  Future<Map<String, Object?>> uploadTransactionReceiptEnvelope({
    required String transactionId,
    required List<int> fileBytes,
    required String fileName,
  });

  Future<Map<String, Object?>> listUserTransactionsEnvelope({
    required String userId,
    int? limit,
  });

  Future<Map<String, Object?>> getVenuePaymentInfoEnvelope({
    required String venueId,
  });

  Future<Map<String, Object?>> getMatchPaymentInfoEnvelope({
    required String matchId,
  });
}

final class DioMonetizationApi implements MonetizationApi {
  DioMonetizationApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> createMatchObligationsEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  }) {
    return _apiClient.postJson(
      '/api/v1/matches/$matchId/transactions/create-obligations',
      body: body,
    );
  }

  @override
  Future<Map<String, Object?>> getMatchTransactionsSummaryEnvelope({
    required String matchId,
  }) {
    return _apiClient.getJson('/api/v1/matches/$matchId/transactions/summary');
  }

  @override
  Future<Map<String, Object?>> confirmTransactionManualEnvelope({
    required String transactionId,
  }) {
    return _apiClient.patchJson('/api/v1/transactions/$transactionId/confirm-manual');
  }

  @override
  Future<Map<String, Object?>> uploadTransactionReceiptEnvelope({
    required String transactionId,
    required List<int> fileBytes,
    required String fileName,
  }) async {
    final safeName = fileName.trim().isEmpty ? 'receipt.jpg' : fileName.trim();
    final formData = FormData.fromMap({
      'file': MultipartFile.fromBytes(
        fileBytes,
        filename: safeName,
      ),
    });

    return _apiClient.postMultipart(
      '/api/v1/transactions/$transactionId/receipt',
      formData: formData,
    );
  }

  @override
  Future<Map<String, Object?>> listUserTransactionsEnvelope({
    required String userId,
    int? limit,
  }) {
    return _apiClient.getJson(
      '/api/v1/users/$userId/transactions',
      queryParameters: {
        if (limit != null) 'limit': limit,
      },
    );
  }

  @override
  Future<Map<String, Object?>> getVenuePaymentInfoEnvelope({
    required String venueId,
  }) {
    return _apiClient.getJson('/api/v1/venues/$venueId/payment-info');
  }

  @override
  Future<Map<String, Object?>> getMatchPaymentInfoEnvelope({
    required String matchId,
  }) {
    return _apiClient.getJson('/api/v1/matches/$matchId/payment-info');
  }
}

