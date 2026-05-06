import 'dart:io';

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
    required File file,
  });

  Future<Map<String, Object?>> listUserTransactionsEnvelope({
    required String userId,
    int? limit,
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
    required File file,
  }) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        file.path,
        filename: file.uri.pathSegments.isEmpty ? 'receipt' : file.uri.pathSegments.last,
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
}

