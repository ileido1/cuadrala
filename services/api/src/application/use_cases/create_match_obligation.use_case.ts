import { AppError } from '../../domain/errors/app_error.js';
import type { PaymentMatchReadRepository } from '../../domain/ports/payment_match_read_repository.js';
import type { PaymentTransactionRepository } from '../../domain/ports/payment_transaction_repository.js';
import type { VenueFeeRuleRepository } from '../../domain/ports/venue_fee_rule_repository.js';
import { computeObligationFeeSV } from '../../domain/services/payments/fee_policy.service.js';
import type { CreateObligationsResultDTO } from '../dto/payment_obligation.dto.js';
import { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

export type CreateMatchObligationInput = {
  matchId: string;
  actorUserId: string;
  amountBasePerPerson: number;
  participantUserIds?: string[];
};

export class CreateMatchObligationUseCase {
  constructor(
    private readonly _matchReadRepository: PaymentMatchReadRepository,
    private readonly _transactionRepository: PaymentTransactionRepository,
    private readonly _feeRuleRepository: VenueFeeRuleRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
  ) {}

  /**
   * @name    :executeSV
   * @version :1.0.0
   * @description :Genera obligaciones de pago para un partido (issue #49).
   * Dos caminos de autorizacion:
   *  - Autoservicio: el actor genera unicamente la suya (`TARGET_IDS` es
   *    exactamente `[actorUserId]`) — el caso real de apps/mobile
   *    (pay_method_screen.dart). Solo exige ser participante del partido.
   *  - Para terceros o "todos los participantes" (el default cuando no se
   *    envia `participantUserIds`, igual que antes de este fix): exige ser
   *    el organizador del partido o staff de su sede, mismo mecanismo que
   *    #50 (`AssertTournamentOrganizerAccessUseCase`, generico a pesar del
   *    nombre).
   * @throws {AppError} 403 si no es participante (autoservicio) o no tiene
   * autoridad de organizador/staff (para terceros)
   */
  async executeSV(_input: CreateMatchObligationInput): Promise<CreateObligationsResultDTO> {
    if (!Number.isFinite(_input.amountBasePerPerson) || _input.amountBasePerPerson <= 0) {
      throw new AppError('MONTO_INVALIDO', 'El monto base por persona debe ser mayor que cero.', 400);
    }

    const MATCH = await this._matchReadRepository.findWithParticipantsSV(_input.matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }

    const PARTICIPANT_IDS = new Set(MATCH.participants.map((_p) => _p.userId));
    const TARGET_IDS = _input.participantUserIds ?? [...PARTICIPANT_IDS];
    const IS_SELF_SERVICE = TARGET_IDS.length === 1 && TARGET_IDS[0] === _input.actorUserId;

    if (IS_SELF_SERVICE) {
      if (!PARTICIPANT_IDS.has(_input.actorUserId)) {
        throw new AppError(
          'NO_AUTORIZADO',
          'Debes ser participante del partido para generar obligaciones de pago.',
          403,
        );
      }
    } else {
      await this._assertTournamentOrganizerAccess.executeSV({
        actorUserId: _input.actorUserId,
        organizerUserId: MATCH.organizerUserId,
        venueId: MATCH.venueId,
        forbiddenMessage:
          'Debes ser el organizador del partido o staff de su sede para generar obligaciones de pago para otros participantes.',
      });

      for (const _uid of TARGET_IDS) {
        if (!PARTICIPANT_IDS.has(_uid)) {
          throw new AppError(
            'PARTICIPANTE_NO_EN_PARTIDO',
            'Uno o más usuarios no pertenecen a este partido.',
            400,
          );
        }
      }
    }

    const VENUE_ID = MATCH.venueId;
    const RULE = VENUE_ID !== null
      ? await this._feeRuleRepository.findActiveForVenueAndScopeSV(VENUE_ID, 'MATCH')
      : await this._feeRuleRepository.findActiveForScopeSV('MATCH');
    const AMOUNT_BASE = String(_input.amountBasePerPerson);
    const AMOUNT_BASE_NUMBER = _input.amountBasePerPerson;
    const CREATED: CreateObligationsResultDTO['created'] = [];
    const SKIPPED: CreateObligationsResultDTO['skipped'] = [];

    for (const _userId of TARGET_IDS) {
      const EXISTING = await this._transactionRepository.findPendingOrConfirmedForMatchUserSV(
        _input.matchId,
        _userId,
      );
      if (EXISTING !== null) {
        SKIPPED.push({ userId: _userId, reason: 'ALREADY_HAS_ACTIVE_OBLIGATION' });
        continue;
      }

      const FEE_NUMBER = computeObligationFeeSV(AMOUNT_BASE_NUMBER, RULE);
      const FEE = String(FEE_NUMBER);
      const TOTAL = String(AMOUNT_BASE_NUMBER + FEE_NUMBER);

      const ROW = await this._transactionRepository.createSV({
        matchId: _input.matchId,
        userId: _userId,
        amountBase: AMOUNT_BASE,
        feeAmount: FEE,
        amountTotal: TOTAL,
      });

      CREATED.push({
        id: ROW.id,
        userId: ROW.userId,
        amountBase: ROW.amountBase.toString(),
        feeAmount: ROW.feeAmount.toString(),
        amountTotal: ROW.amountTotal.toString(),
        status: ROW.status,
      });
    }

    return { created: CREATED, skipped: SKIPPED };
  }
}
