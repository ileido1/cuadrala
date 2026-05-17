import {
  CreateVenuePaymentMethodUseCase,
  DeleteVenuePaymentMethodUseCase,
  ListActiveVenuePaymentMethodsUseCase,
  ListAllVenuePaymentMethodsUseCase,
  UpdateVenuePaymentMethodUseCase,
} from '../../application/use_cases/venue_payment_method.use_cases.js';
import { PrismaVenuePaymentMethodRepository } from '../../infrastructure/adapters/prisma_venue_payment_method_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';

const VENUE_PAYMENT_METHOD_REPOSITORY = new PrismaVenuePaymentMethodRepository();
const VENUE_STAFF_REPOSITORY = new PrismaVenueStaffRepository();

export const LIST_ACTIVE_VENUE_PAYMENT_METHODS_UC = new ListActiveVenuePaymentMethodsUseCase(
  VENUE_PAYMENT_METHOD_REPOSITORY,
);

export const LIST_ALL_VENUE_PAYMENT_METHODS_UC = new ListAllVenuePaymentMethodsUseCase(
  VENUE_PAYMENT_METHOD_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
);

export const CREATE_VENUE_PAYMENT_METHOD_UC = new CreateVenuePaymentMethodUseCase(
  VENUE_PAYMENT_METHOD_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
);

export const UPDATE_VENUE_PAYMENT_METHOD_UC = new UpdateVenuePaymentMethodUseCase(
  VENUE_PAYMENT_METHOD_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
);

export const DELETE_VENUE_PAYMENT_METHOD_UC = new DeleteVenuePaymentMethodUseCase(
  VENUE_PAYMENT_METHOD_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
);
