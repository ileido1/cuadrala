'use client';

interface RegistrationListItemProps {
  id: string;
  userName: string;
  status: 'PENDING' | 'CONFIRMED' | 'WITHDRAWN';
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Pendiente',
    className: 'bg-amber-100 text-amber-800',
  },
  CONFIRMED: {
    label: 'Confirmado',
    className: 'bg-green-100 text-green-800',
  },
  WITHDRAWN: {
    label: 'Retirado',
    className: 'bg-gray-100 text-gray-800',
  },
};

export function RegistrationListItemComponent({ userName, status, createdAt }: RegistrationListItemProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
        {userName}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
        >
          {config.label}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        {formatDate(createdAt)}
      </td>
    </tr>
  );
}