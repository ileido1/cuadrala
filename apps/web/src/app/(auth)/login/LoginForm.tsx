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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '320px', padding: '24px', border: '1px solid #e5e7eb', borderRadius: '8px' }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Iniciar Sesión</h1>

        {error && (
          <div role="alert" style={{ color: '#dc2626', fontSize: '14px', padding: '8px', background: '#fef2f2', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="email" style={{ fontSize: '14px', fontWeight: '500' }}>Email</label>
          <input
            id="email"
            type="email"
            {...register('email')}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
          />
          {errors.email && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.email.message}</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="password" style={{ fontSize: '14px', fontWeight: '500' }}>Contraseña</label>
          <input
            id="password"
            type="password"
            {...register('password')}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' }}
          />
          {errors.password && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.password.message}</span>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '10px 16px',
            backgroundColor: '#0ea5e9',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? 'Cargando...' : 'Iniciar Sesión'}
        </button>
      </form>
    </div>
  );
}