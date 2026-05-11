export default function CourtsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 animate-fade-in">
      <div className="w-24 h-24 rounded-2xl bg-surface-container flex items-center justify-center mb-6 shadow-inner">
        <svg
          className="w-12 h-12 text-secondary-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 3H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-4M9 3h6m-6 0v16m6-16v16"
          />
        </svg>
      </div>
      <h2 className="section-heading mb-3">Próximamente</h2>
      <p className="text-secondary-500 max-w-sm text-base">Esta sección aún no está disponible</p>
    </div>
  );
}