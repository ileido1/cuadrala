'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { apiClient, type TournamentInviteLinkPreview } from '~/lib/api-client';
import { ErrorState } from '~/components/shared/ErrorState';
import { LoadingSkeleton } from '~/components/shared/LoadingSkeleton';
import { InviteForm } from './invite-form';

type InvalidReason = 'EXPIRED' | 'REVOKED' | 'EXHAUSTED' | 'UNKNOWN';

// REQ-TIL-012: the landing MUST show a reason-specific message, never a
// generic error, for the three states the backend's `assertTournamentInviteLinkUsableSV`
// rejects by throwing (see services/api's `tournament_invite_link_validity.ts`).
const INVALID_REASON_MESSAGES: Record<InvalidReason, string> = {
  EXPIRED: 'Este enlace de invitación expiró. Pedile al organizador uno nuevo.',
  REVOKED: 'Este enlace de invitación fue revocado por el organizador.',
  EXHAUSTED: 'Este enlace de invitación ya fue agotado: alcanzó su límite de usos.',
  UNKNOWN: 'No se pudo cargar la invitación. Verificá el enlace e intentá de nuevo.',
};

function reasonFromErrorCode(_code: string | undefined): InvalidReason {
  switch (_code) {
    case 'ENLACE_INVALIDO':
      return 'EXPIRED';
    case 'ENLACE_REVOCADO':
      return 'REVOKED';
    case 'ENLACE_AGOTADO':
      return 'EXHAUSTED';
    default:
      return 'UNKNOWN';
  }
}

type PageState =
  | { status: 'loading' }
  | { status: 'invalid'; reason: InvalidReason }
  | { status: 'loaded'; preview: TournamentInviteLinkPreview };

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

/**
 * REQ-TIL-012: public landing for a tournament invite link. Fetches the
 * preview and, when the link is usable, renders the real registration form
 * (`InviteForm`) inline — it is not a "download the app" placeholder.
 */
export default function InvitePage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<PageState>({ status: 'loading' });

  const fetchPreview = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const response = await apiClient.getTournamentInviteLinkPreview(token);
      setState({ status: 'loaded', preview: response.data.data });
    } catch (_error: unknown) {
      const code = (_error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      setState({ status: 'invalid', reason: reasonFromErrorCode(code) });
    }
  }, [token]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  if (state.status === 'loading') {
    return <LoadingSkeleton rows={4} />;
  }

  if (state.status === 'invalid') {
    return <ErrorState message={INVALID_REASON_MESSAGES[state.reason]} />;
  }

  const { preview } = state;

  // REQ-TIL-009: the backend never throws for a closed tournament on the
  // preview endpoint (`acceptsRegistration` is purely informational) — the
  // landing is the one responsible for turning that into the specific
  // "closed" message instead of rendering a form that will fail on submit.
  if (!preview.acceptsRegistration) {
    return <ErrorState message="Este torneo ya cerró su inscripción." />;
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-display font-bold mb-1">{preview.tournamentName}</h1>
      <p className="text-secondary-500 mb-4">
        {preview.sportName} · {preview.categoryName}
        {preview.venueName ? ` · ${preview.venueName}` : ''}
      </p>
      <p className="text-sm text-secondary-500 mb-6">Comienza el {formatDate(preview.startsAt)}</p>

      <InviteForm token={token} />
    </div>
  );
}
