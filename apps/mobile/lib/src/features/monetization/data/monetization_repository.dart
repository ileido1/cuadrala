import '../../../core/failures/app_failure.dart';
import '../../profile/data/profile_repository.dart';
import 'models/match_transactions_summary_dto.dart';
import 'models/transaction_dto.dart';
import 'models/venue_payment_info_dto.dart';
import 'monetization_api.dart';

final class UserTransactionsResult {
  const UserTransactionsResult({
    required this.userId,
    required this.transactions,
  });

  final String userId;
  final List<TransactionDto> transactions;
}

class MonetizationRepository {
  MonetizationRepository({
    required MonetizationApi monetizationApi,
    required ProfileRepository profileRepository,
  })  : _api = monetizationApi,
        _profileRepository = profileRepository;

  final MonetizationApi _api;
  final ProfileRepository _profileRepository;

  Future<Map<String, Object?>> createMatchObligations({
    required String matchId,
    required num amountBasePerPerson,
    List<String>? participantUserIds,
  }) async {
    final json = await _api.createMatchObligationsEnvelope(
      matchId: matchId,
      body: {
        'amountBasePerPerson': amountBasePerPerson,
        if (participantUserIds != null) 'participantUserIds': participantUserIds,
      },
    );
    // Backend suele responder envelope; si no, devolvemos raw.
    final data = json['data'];
    if (data is Map<String, Object?>) return data;
    return json;
  }

  Future<MatchTransactionsSummaryDto> getMatchTransactionsSummary({
    required String matchId,
  }) async {
    final json = await _api.getMatchTransactionsSummaryEnvelope(matchId: matchId);
    final data = json['data'];
    if (data is Map<String, Object?>) {
      return MatchTransactionsSummaryDto.fromJson(data);
    }
    if (json['matchId'] is String) {
      return MatchTransactionsSummaryDto.fromJson(json);
    }
    throw const AppFailure(
      code: 'INVALID_RESPONSE',
      message: 'Respuesta inválida del servidor.',
    );
  }

  Future<TransactionDto> confirmTransactionManual({
    required String transactionId,
  }) async {
    final json = await _api.confirmTransactionManualEnvelope(
      transactionId: transactionId,
    );
    final data = json['data'];
    if (data is Map<String, Object?>) {
      // confirm-manual devuelve {id,status,confirmedAt}; completamos el resto en UI si hace falta.
      return TransactionDto(
        id: data['id'] as String,
        matchId: '',
        userId: '',
        amountBase: '0',
        feeAmount: '0',
        amountTotal: '0',
        status: data['status'] as String,
        paymentMethod: 'MANUAL',
        confirmedAt: DateTime.tryParse(data['confirmedAt'] as String),
        createdAt: DateTime.now(),
      );
    }
    throw const AppFailure(
      code: 'INVALID_RESPONSE',
      message: 'Respuesta inválida del servidor.',
    );
  }

  Future<Map<String, Object?>> uploadReceipt({
    required String transactionId,
    required List<int> fileBytes,
    required String fileName,
  }) async {
    final json = await _api.uploadTransactionReceiptEnvelope(
      transactionId: transactionId,
      fileBytes: fileBytes,
      fileName: fileName,
    );
    final data = json['data'];
    if (data is Map<String, Object?>) return data;
    return json;
  }

  Future<UserTransactionsResult> listMyTransactions({int? limit}) async {
    final me = await _profileRepository.getMe();
    final json = await _api.listUserTransactionsEnvelope(
      userId: me.id,
      limit: limit,
    );
    final data = json['data'];
    final raw = data is Map<String, Object?> ? data : json;
    final userId = (raw['userId'] as String?) ?? me.id;

    final txRaw = raw['transactions'];
    if (txRaw is! List) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }

    final items = txRaw
        .whereType<Map<String, Object?>>()
        .map(TransactionDto.fromJson)
        .toList();

    return UserTransactionsResult(userId: userId, transactions: items);
  }

  Future<UserTransactionsResult> listUserTransactions({
    required String userId,
    int? limit,
  }) async {
    final json = await _api.listUserTransactionsEnvelope(
      userId: userId,
      limit: limit,
    );
    final data = json['data'];
    final raw = data is Map<String, Object?> ? data : json;
    final resolvedUserId = (raw['userId'] as String?) ?? userId;

    final txRaw = raw['transactions'];
    if (txRaw is! List) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }

    final items = txRaw
        .whereType<Map<String, Object?>>()
        .map(TransactionDto.fromJson)
        .toList();

    return UserTransactionsResult(userId: resolvedUserId, transactions: items);
  }

  Future<VenuePaymentInfoDto> getVenuePaymentInfo({
    required String venueId,
  }) async {
    final json = await _api.getVenuePaymentInfoEnvelope(venueId: venueId);
    final data = json['data'];
    if (data is Map<String, Object?>) {
      return VenuePaymentInfoDto.fromJson(data);
    }
    throw const AppFailure(
      code: 'INVALID_RESPONSE',
      message: 'Respuesta inválida del servidor.',
    );
  }
}

