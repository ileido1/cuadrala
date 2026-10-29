'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { apiClient, type TournamentInviteLinkRegistrationResult } from '~/lib/api-client';

// NFR-TIL-003: same limits as `INVITE_GUEST_TOURNAMENT_PARTICIPANT_BODY_SCHEMA`
// in the API (`name` 1-100 chars, `phone` optional `^\+?\d{8,15}$`, `email`
// required and valid). This is client-side UX only — the backend remains the
// source of truth and re-validates on submit.
const guestSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'El nombre es demasiado largo'),
  phone: z
    .string()
    .regex(/^\+?\d{8,15}$/, 'Teléfono inválido')
    .optional()
    .or(z.literal('')),
  email: z.string().min(1, 'El email es obligatorio').email('Email inválido'),
});

type GuestFormData = z.infer<typeof guestSchema>;

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

interface InviteFormProps {
  token: string;
}

function extractErrorMessage(_error: unknown): string {
  const axiosMessage = (_error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message;
  return axiosMessage ?? 'No se pudo completar la inscripción. Intentá de nuevo.';
}

/**
 * REQ-TIL-007/008/012: completes the full registration (authenticated or
 * guest) by calling the same public endpoint the backend contract and the
 * mobile app use — never just a "download the app" placeholder.
 */
export function InviteForm({ token }: InviteFormProps) {
  // The same source of truth `ApiClient`'s request interceptor reads
  // (`localStorage.accessToken`) decides whether this renders the guest
  // form or the one-click confirm button, so the two never disagree about
  // whether `Authorization` will be attached to the request.
  const [hasSession, setHasSession] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<TournamentInviteLinkRegistrationResult | null>(null);

  useEffect(() => {
    setHasSession(Boolean(localStorage.getItem('accessToken')));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
  });

  const submitRegistration = async (body: { name?: string; phone?: string; email?: string }) => {
    setStatus('submitting');
    setErrorMessage(null);
    try {
      const response = await apiClient.registerViaTournamentInviteLink(token, body);
      setResult(response.data.data);
      setStatus('success');
    } catch (_error: unknown) {
      setErrorMessage(extractErrorMessage(_error));
      setStatus('error');
    }
  };

  const onGuestSubmit = (data: GuestFormData) =>
    submitRegistration({
      name: data.name,
      email: data.email,
      ...(data.phone ? { phone: data.phone } : {}),
    });

  const onConfirmAuthenticated = () => submitRegistration({});

  if (status === 'success' && result) {
    return (
      <div role="status" className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
        <p className="font-semibold">Inscripción confirmada</p>
        <p className="text-sm mt-1">Tu inscripción quedó en estado {result.status}.</p>
      </div>
    );
  }

  return (
    <div>
      {errorMessage && (
        <div role="alert" className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {errorMessage}
        </div>
      )}

      {hasSession ? (
        <button
          type="button"
          onClick={onConfirmAuthenticated}
          disabled={status === 'submitting'}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {status === 'submitting' ? 'Confirmando...' : 'Confirmar inscripción'}
        </button>
      ) : (
        // `noValidate`: the browser's native `type="email"` constraint
        // validation otherwise suppresses the `submit` event entirely on an
        // invalid value, so react-hook-form's zod validation (which owns the
        // error messages shown below) never runs.
        <form onSubmit={handleSubmit(onGuestSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor="invite-name">Nombre</label>
            <input id="invite-name" type="text" {...register('name')} />
            {errors.name && (
              <p role="alert" className="text-red-600 text-sm">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="invite-phone">Teléfono (opcional)</label>
            <input id="invite-phone" type="tel" {...register('phone')} />
            {errors.phone && (
              <p role="alert" className="text-red-600 text-sm">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="invite-email">Email</label>
            <input id="invite-email" type="email" {...register('email')} />
            {errors.email && (
              <p role="alert" className="text-red-600 text-sm">
                {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {status === 'submitting' ? 'Inscribiendo...' : 'Confirmar inscripción'}
          </button>
        </form>
      )}
    </div>
  );
}

export default InviteForm;
