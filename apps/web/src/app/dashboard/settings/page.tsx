const DAYS = [
  { label: 'Lun', active: true },
  { label: 'Mar', active: true },
  { label: 'Mié', active: true },
  { label: 'Jue', active: true },
  { label: 'Vie', active: true },
  { label: 'Sáb', active: true },
  { label: 'Dom', active: false },
] as const;

export default function SettingsPage() {
  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="page-heading mb-2">Configuración</h1>
        <p className="text-body text-base">Ajustes generales del club</p>
      </div>

      {/* Card 1: Datos del Club */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h2 className="section-heading">Datos del Club</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {/* Nombre del Club */}
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              NOMBRE DEL CLUB
            </label>
            <input
              type="text"
              className="input"
              defaultValue="Club Palermo"
            />
          </div>

          {/* Teléfono de Contacto */}
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              TELÉFONO DE CONTACTO
            </label>
            <input
              type="text"
              className="input"
              defaultValue="+54 9 11 4523-7890"
            />
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              DIRECCIÓN
            </label>
            <input
              type="text"
              className="input"
              defaultValue="Av. del Libertador 1234, CABA"
            />
          </div>

          {/* Email de Contacto */}
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              EMAIL DE CONTACTO
            </label>
            <input
              type="email"
              className="input"
              defaultValue="admin@clubpalermo.com"
            />
          </div>

          {/* Descripción del Club (full width) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              DESCRIPCIÓN DEL CLUB
            </label>
            <textarea
              className="input min-h-[100px] resize-none"
              defaultValue="Club deportivo especializado en pádel y tenis con 5 canchas en el corazón de Palermo."
            />
          </div>
        </div>
      </div>

      {/* Card 2: Horarios de Atención */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="section-heading">Horarios de Atención</h2>
        </div>

        <div className="space-y-5">
          {/* Días Habilitados */}
          <div>
            <label className="block text-sm font-semibold text-secondary-700 mb-3">
              DÍAS HABILITADOS
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day.label}
                  type="button"
                  className={`
                    min-w-[52px] px-3 py-2 rounded-lg text-sm font-semibold transition-all
                    ${
                      day.active
                        ? 'bg-primary text-white'
                        : 'bg-surface-container text-secondary-500'
                    }
                  `}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6">
            {/* Apertura */}
            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-2">
                APERTURA
              </label>
              <input
                type="text"
                className="input"
                defaultValue="08:00"
              />
            </div>

            {/* Cierre */}
            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-2">
                CIERRE
              </label>
              <input
                type="text"
                className="input"
                defaultValue="23:00"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Tarifas por Franja Horaria (Placeholder) */}
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="section-heading">Tarifas por Franja Horaria</h2>
        </div>

        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-secondary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <p className="text-secondary-500 max-w-xs text-base">
            Próximamente
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button type="button" className="btn btn-primary px-8">
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
