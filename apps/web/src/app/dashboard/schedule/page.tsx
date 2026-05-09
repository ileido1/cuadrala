export default function SchedulePage() {
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
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <p className="text-lg font-medium">Próximamente</p>
      <p className="text-sm text-gray-400">Esta sección aún no está disponible</p>
    </div>
  );
}
