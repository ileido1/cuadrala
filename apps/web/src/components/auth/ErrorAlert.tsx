interface ErrorAlertProps {
  message: string | null;
  onDismiss: () => void;
}

export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  if (!message) return null;

  return (
    <div role="alert" className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl">
      <div className="flex items-center gap-3 text-red-700 text-sm">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="flex-1">{message}</span>
        <button
          onClick={onDismiss}
          className="ml-auto flex-shrink-0 text-red-500 hover:text-red-600 font-semibold"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
