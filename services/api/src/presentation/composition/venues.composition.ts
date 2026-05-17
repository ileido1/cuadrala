import {
  CancelCourtUseCase,
  CreateCourtUseCase,
  ListCourtsUseCase,
  UpdateCourtUseCase,
} from '../../application/use_cases/court.use_cases.js';
import {
  CreateVenueUseCase,
  GetVenueDetailUseCase,
  GetVenuePaymentInfoUseCase,
  ListMyVenuesUseCase,
  ListVenuesUseCase,
} from '../../application/use_cases/venue_catalog.use_cases.js';
import { PrismaCourtRepository } from '../../infrastructure/adapters/prisma_court_repository.js';
import { PrismaUserRepository } from '../../infrastructure/adapters/prisma_user_repository.js';
import { PrismaVenueRepository } from '../../infrastructure/adapters/prisma_venue_repository.js';

const VENUE_REPOSITORY = new PrismaVenueRepository();
const COURT_REPOSITORY = new PrismaCourtRepository();
const USER_REPOSITORY = new PrismaUserRepository();

export const LIST_VENUES_UC = new ListVenuesUseCase(VENUE_REPOSITORY);
export const LIST_MY_VENUES_UC = new ListMyVenuesUseCase(VENUE_REPOSITORY);
export const CREATE_VENUE_UC = new CreateVenueUseCase(VENUE_REPOSITORY, USER_REPOSITORY);
export const GET_VENUE_DETAIL_UC = new GetVenueDetailUseCase(VENUE_REPOSITORY);
export const GET_VENUE_PAYMENT_INFO_UC = new GetVenuePaymentInfoUseCase(VENUE_REPOSITORY);

export const CREATE_COURT_UC = new CreateCourtUseCase(COURT_REPOSITORY, VENUE_REPOSITORY);
export const LIST_COURTS_UC = new ListCourtsUseCase(COURT_REPOSITORY, VENUE_REPOSITORY);
export const UPDATE_COURT_UC = new UpdateCourtUseCase(COURT_REPOSITORY);
export const CANCEL_COURT_UC = new CancelCourtUseCase(COURT_REPOSITORY);
