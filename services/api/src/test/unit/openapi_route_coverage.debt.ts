/**
 * Rutas que existen pero todavia no estan en `openapi.ts`.
 *
 * Es una lista de deuda, no una lista de excepciones permanentes: el test de
 * cobertura falla si una ruta nueva no aparece aca ni en el spec, y tambien si
 * una entrada de aca ya se documento o dejo de existir. Vaciarla es el objetivo.
 *
 * Al 2026-09-01: 59 rutas de 142. `/docs` y `/openapi.json` sirven el spec y no
 * hace falta documentarlas, asi que el numero accionable es 57.
 */
export const UNDOCUMENTED_ROUTES: readonly string[] = [
  //? bookings — 5 de 5
  'GET /venues/:venueId/bookings',
  'POST /venues/:venueId/bookings',
  'DELETE /venues/:venueId/bookings/:bookingId',
  'GET /venues/:venueId/bookings/:bookingId',
  'PATCH /venues/:venueId/bookings/:bookingId',

  //? docs — 2 de 2
  'GET /docs',
  'GET /openapi.json',

  //? exchange_rate — 2 de 2
  'GET /countries/:countryCode/exchange-rates',
  'POST /countries/:countryCode/exchange-rates/refresh',

  //? matches — 1 de 15
  'GET /matches/mine',

  //? monetization — 3 de 11
  'POST /reservations/:reservationId/transactions/create-obligations',
  'GET /reservations/:reservationId/transactions/summary',
  'PATCH /transactions/:transactionId/player-payment-selection',

  //? profile — 2 de 25
  'PUT /users/me/onboarding-status',
  'GET /users/search/by-document',

  //? reservations — 6 de 6
  'DELETE /venues/:venueId/courts/:courtId/slots/block',
  'POST /venues/:venueId/courts/:courtId/slots/block',
  'GET /venues/:venueId/reservations',
  'POST /venues/:venueId/reservations',
  'DELETE /venues/:venueId/reservations/:reservationId',
  'POST /venues/:venueId/reservations/:reservationId/ledger/compensatory-adjustments',

  //? tournament_invitation — 4 de 4
  'GET /tournaments/:tournamentId/invitations',
  'POST /tournaments/:tournamentId/invitations',
  'DELETE /tournaments/:tournamentId/invitations/:invitationId',
  'POST /tournaments/:tournamentId/invitations/:invitationId/respond',

  //? tournament_registration — 6 de 6
  'POST /tournaments/:tournamentId/invite-guest',
  'GET /tournaments/:tournamentId/registrations',
  'POST /tournaments/:tournamentId/registrations',
  'DELETE /tournaments/:tournamentId/registrations/:registrationId',
  'PATCH /tournaments/:tournamentId/registrations/:registrationId',
  'POST /tournaments/:tournamentId/registrations/:userId/withdraw',

  //? tournaments — 7 de 7
  'GET /tournaments',
  'GET /tournaments/:tournamentId',
  'GET /tournaments/:tournamentId/bracket',
  'POST /tournaments/:tournamentId/matches/:matchId/results',
  'PATCH /tournaments/:tournamentId/status',
  'PATCH /tournaments/:tournamentId/visibility',
  'GET /tournaments/venue/:venueId',

  //? venue_payment_method — 5 de 5
  'GET /venues/:venueId/payment-methods',
  'POST /venues/:venueId/payment-methods',
  'DELETE /venues/:venueId/payment-methods/:paymentMethodId',
  'PUT /venues/:venueId/payment-methods/:paymentMethodId',
  'GET /venues/:venueId/payment-methods/all',

  //? venues — 16 de 21
  'POST /venues',
  'GET /venues/:venueId',
  'PATCH /venues/:venueId',
  'POST /venues/:venueId/courts',
  'DELETE /venues/:venueId/courts/:courtId',
  'PUT /venues/:venueId/courts/:courtId',
  'GET /venues/:venueId/courts/:courtId/pricing-tiers',
  'POST /venues/:venueId/courts/:courtId/pricing-tiers',
  'DELETE /venues/:venueId/courts/:courtId/pricing-tiers/:tierId',
  'PUT /venues/:venueId/courts/:courtId/pricing-tiers/:tierId',
  'GET /venues/:venueId/courts/:courtId/slots',
  'GET /venues/:venueId/dashboard-stats',
  'GET /venues/:venueId/matches',
  'GET /venues/:venueId/transactions/history',
  'GET /venues/:venueId/transactions/stats',
  'GET /venues/mine',
];
