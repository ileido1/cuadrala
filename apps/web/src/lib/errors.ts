/**
 * Error message mapping from backend error codes to user-friendly Spanish messages
 */

export const ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  TOKEN_INVALIDO: 'Token inválido o expirado. Intentá de nuevo.',
  VALIDACION_FALLIDA: 'Error al verificar tu identidad. Intentá de nuevo.',
  ERROR_INTERNO: 'Error interno del servidor. Intentá más tarde.',
  UNAUTHORIZED: 'No autorizado. Intentá de nuevo.',

  // Network errors
  TIMEOUT: 'Conexión lenta. Verificá tu internet e intentá de nuevo.',
  NETWORK_ERROR: 'Error de conexión. Verificá tu internet e intentá de nuevo.',
  CONNECTION_FAILED: 'No se pudo conectar con el servidor. Intentá de nuevo.',

  // HTTP status codes
  '400': 'Solicitud inválida. Verificá los datos e intentá de nuevo.',
  '401': 'No autorizado. Iniciá sesión de nuevo.',
  '403': 'No tenés permiso para realizar esta acción.',
  '404': 'Recurso no encontrado.',
  '408': 'Tiempo de espera agotado. Intentá de nuevo.',
  '429': 'Demasiadas solicitudes. Esperá un momento e intentá de nuevo.',
  '500': 'Error en el servidor. Intentá más tarde.',
  '502': 'Gateway error. Intentá más tarde.',
  '503': 'Servicio no disponible. Intentá más tarde.',

  // Social login errors
  GOOGLE_SDK_NOT_LOADED: 'Google authentication no está configurado',
  GOOGLE_SIGNIN_CANCELLED: 'Autenticación cancelada',
  SESSION_EXPIRED: 'Tu sesión expiró. Ingresá de nuevo.',
  TOKEN_REFRESH_FAILED: 'No se pudo renovar tu sesión. Ingresá de nuevo.',
};

/**
 * Get user-friendly error message from error code or backend message
 */
export function getUserMessage(error: unknown): string {
  // If it's already a string message
  if (typeof error === 'string') {
    // Check if it's in our mapping
    if (error in ERROR_MESSAGES) {
      return ERROR_MESSAGES[error as keyof typeof ERROR_MESSAGES];
    }
    // Return the string as-is if not a known code
    if (error.length < 200) {
      // Assume short strings are backend error messages
      return error;
    }
  }

  // If it's an Error object
  if (error instanceof Error) {
    // Check the error message
    const message = error.message;
    if (message in ERROR_MESSAGES) {
      return ERROR_MESSAGES[message as keyof typeof ERROR_MESSAGES];
    }
    // Return message as-is if short and likely backend message
    if (message.length < 200 && message.includes(' ')) {
      return message;
    }
  }

  // Default fallback
  return 'Algo salió mal. Intentá de nuevo.';
}

/**
 * Map HTTP status code to error message
 */
export function getStatusMessage(status: number): string {
  const message = ERROR_MESSAGES[status.toString()];
  return message || `Error ${status}. Intentá de nuevo.`;
}
