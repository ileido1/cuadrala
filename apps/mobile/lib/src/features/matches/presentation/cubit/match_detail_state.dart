import 'package:equatable/equatable.dart';

import '../../../../core/formatting/money_conversion.dart';
import '../../../profile/data/models/user_rating_dto.dart';
import '../../data/models/match_detail_dto.dart';

sealed class MatchDetailState extends Equatable {
  const MatchDetailState();

  @override
  List<Object?> get props => [];
}

final class MatchDetailInitial extends MatchDetailState {
  const MatchDetailInitial();
}

final class MatchDetailLoading extends MatchDetailState {
  const MatchDetailLoading();
}

final class MatchDetailLoaded extends MatchDetailState {
  const MatchDetailLoaded({
    required this.match,
    required this.viewerUserId,
    this.viewerHasConfirmedPayment = false,
    this.viewerHasPendingPayment = false,
    this.participantsConfirmedPayment = const {},
    this.actionLoading = false,
    this.actionMessage,
    this.actionMessageIsError = false,
    this.exchangeRates = const [],
    this.viewerEloChange,
  });

  final MatchDetailDto match;
  final String viewerUserId;
  final bool viewerHasConfirmedPayment;

  /// El viewer envió un comprobante que el staff aún no confirmó (en revisión).
  final bool viewerHasPendingPayment;

  /// Pago confirmado real de cada participante que NO es el viewer, por
  /// userId. Antes el layout de cancha asumía "pagado" para cualquiera que
  /// no fuera el viewer; esto trae el dato real para evitarlo.
  final Map<String, bool> participantsConfirmedPayment;
  final bool actionLoading;
  final String? actionMessage;
  final bool actionMessageIsError;
  final List<ExchangeRateRow> exchangeRates;

  /// Cambio de ELO del viewer para este match, si el resultado ya quedó
  /// finalizado (las 4 confirmaciones cerraron y el historial tiene una
  /// fila para este matchId). `null` mientras el resultado sigue pendiente
  /// de confirmación, o si el partido no afecta ELO.
  final UserRatingHistoryItemDto? viewerEloChange;

  bool get isParticipant => match.participants.any((p) => p.userId == viewerUserId);

  @override
  List<Object?> get props => [
        match,
        viewerUserId,
        viewerHasConfirmedPayment,
        viewerHasPendingPayment,
        participantsConfirmedPayment,
        actionLoading,
        actionMessage,
        actionMessageIsError,
        exchangeRates,
        viewerEloChange,
      ];
}

final class MatchDetailFailure extends MatchDetailState {
  const MatchDetailFailure({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}

final class MatchDetailNotFound extends MatchDetailState {
  const MatchDetailNotFound();
}
