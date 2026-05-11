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
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
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
    <div className="min-h-screen bg-dots-pattern flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-tertiary-500/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Brand header */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-500 rounded-2xl shadow-lg mb-6 transform hover:scale-105 transition-transform duration-300">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="font-display text-4xl font-bold text-secondary-900 tracking-tight">Cuadrala</h1>
          <p className="text-body mt-3 text-base">Panel de gestión</p>
        </div>

        {/* Login card */}
        <div className="card p-8 shadow-card animate-fade-in stagger-1">
          <h2 className="section-heading mb-6 text-center">Iniciar Sesión</h2>

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
                placeholder="tu@email.com"
                autoComplete="email"
                {...register('email')}
                className={`input ${errors.email ? 'input-error' : ''}`}
              />
              {errors.email && (
                <span className="text-xs text-red-600 font-medium">{errors.email.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-secondary-700">Contraseña</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password')}
                className={`input ${errors.password ? 'input-error' : ''}`}
              />
              {errors.password && (
                <span className="text-xs text-red-600 font-medium">{errors.password.message}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full text-base mt-6"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Cargando...
                </span>
              ) : 'Iniciar Sesión'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted mt-8 animate-fade-in stagger-2">
          &copy; 2024 Cuadrala
        </p>
      </div>
    </div>
  );
}