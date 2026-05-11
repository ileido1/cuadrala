'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  remember: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    text: 'Dashboard de ingresos en tiempo real',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    text: 'Gestión de canchas y disponibilidad',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    text: 'Calendario de reservas semanal',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    text: 'Control de pagos y comprobantes',
  },
];

const stats = [
  { value: '500+', label: 'Clubs activos' },
  { value: '98%', label: 'Uptime garantizado' },
  { value: '24/7', label: 'Soporte técnico' },
];

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    defaultValues: {
      remember: false,
    },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError('Credenciales inválidas');
      return;
    }

    if (result?.ok) {
      const session = await fetch('/api/auth/session').then(r => r.json());
      if (session?.accessToken) {
        localStorage.setItem('accessToken', session.accessToken);
        localStorage.setItem('refreshToken', session.refreshToken ?? '');
      }
      router.push(callbackUrl);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL - Dark navy background */}
      <div className="hidden lg:flex lg:w-1/2 bg-secondary-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        {/* Logo and badge */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            {/* Logo circle with C */}
            <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <div>
              <h1 className="text-white font-display text-2xl font-bold">Cuádrala</h1>
              <p className="text-secondary-400 text-xs font-medium tracking-wider uppercase">Backoffice</p>
            </div>
          </div>

          {/* Admin badge */}
          <span className="inline-block px-4 py-1.5 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-400 text-xs font-semibold">
            PANEL DE ADMINISTRACIÓN
          </span>
        </div>

        {/* Center content - Headline and features */}
        <div className="relative z-10">
          <h2 className="text-white font-display text-4xl font-bold leading-tight mb-4">
            Gestioná tu club<br />
            <span className="text-primary-400">desde un solo lugar</span>
          </h2>
          <p className="text-secondary-400 text-base mb-8 max-w-md">
            Canchas, reservas y pagos bajo control. Todo lo que necesitás para administrar tu espacio deportivo.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-secondary-800 rounded-lg flex items-center justify-center text-primary-400">
                  {feature.icon}
                </div>
                <span className="text-secondary-300 text-sm">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 flex gap-12">
          {stats.map((stat, index) => (
            <div key={index}>
              <p className="text-primary-400 font-display text-2xl font-bold">{stat.value}</p>
              <p className="text-secondary-500 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL - Light gray background */}
      <div className="w-full lg:w-1/2 bg-secondary-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <div>
              <h1 className="text-secondary-900 font-display text-xl font-bold">Cuádrala</h1>
              <p className="text-secondary-500 text-xs font-medium tracking-wider uppercase">Backoffice</p>
            </div>
          </div>

          {/* Card with tabs */}
          <div className="bg-surface rounded-2xl shadow-card p-8">
            {/* Tabs */}
            <div className="flex border-b border-secondary-200 mb-8">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'login'
                    ? 'border-secondary-900 text-secondary-900'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={`pb-3 px-1 ml-6 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'register'
                    ? 'border-secondary-900 text-secondary-900'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700'
                }`}
              >
                Crear cuenta
              </button>
            </div>

            {/* Form content */}
            <div className={activeTab === 'register' ? 'opacity-50 pointer-events-none' : ''}>
              <h3 className="text-secondary-900 font-display text-2xl font-bold mb-2">Bienvenido de vuelta</h3>
              <p className="text-secondary-500 text-sm mb-6">Ingresá con tu cuenta de administrador</p>

              {error && (
                <div role="alert" className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-3 text-red-700 text-sm">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-secondary-700">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="admin@clubpalermo.com"
                    autoComplete="email"
                    {...register('email')}
                    className={`w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-secondary-900 placeholder-secondary-400 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${errors.email ? 'border-red-400 focus:ring-red-500/20 focus:border-red-400' : ''}`}
                  />
                  {errors.email && (
                    <span className="text-xs text-red-600 font-medium">{errors.email.message}</span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-secondary-700">Contraseña</label>
                    <a href="#" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register('password')}
                    className={`w-full px-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-secondary-900 placeholder-secondary-400 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${errors.password ? 'border-red-400 focus:ring-red-500/20 focus:border-red-400' : ''}`}
                  />
                  {errors.password && (
                    <span className="text-xs text-red-600 font-medium">{errors.password.message}</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="remember"
                    type="checkbox"
                    {...register('remember')}
                    className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="remember" className="text-sm text-secondary-600">
                    Recordarme en este equipo
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Cargando...
                    </>
                  ) : (
                    <>
                      Ingresar al panel
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-secondary-200" />
                <span className="text-secondary-400 text-sm">o continuá con</span>
                <div className="flex-1 h-px bg-secondary-200" />
              </div>

              {/* Social buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-secondary-700 text-sm font-medium">Google</span>
                </button>
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span className="text-secondary-700 text-sm font-medium">Apple</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-secondary-400 mt-6">
            Al ingresar aceptás los{' '}
            <a href="#" className="text-primary-600 hover:underline">Términos de servicio</a>
            {' '}y la{' '}
            <a href="#" className="text-primary-600 hover:underline">Política de privacidad</a>
          </p>
        </div>
      </div>
    </div>
  );
}