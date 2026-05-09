export default function PaymentsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 text-gray-500">
      <svg
        className="w-16 h-16 mb-4 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
      <p className="text-lg font-medium">Próximamente</p>
      <p className="text-sm text-gray-400">Esta sección aún no está disponible</p>
    </div>
  );
}
