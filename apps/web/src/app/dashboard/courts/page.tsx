export default function CourtsPage() {
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
          d="M9 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-4M9 4h6m-6 0v16m6-16v16"
        />
      </svg>
      <p className="text-lg font-medium">Próximamente</p>
      <p className="text-sm text-gray-400">Esta sección aún no está disponible</p>
    </div>
  );
}
