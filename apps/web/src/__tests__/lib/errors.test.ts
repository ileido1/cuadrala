import { describe, it, expect } from 'vitest';
import { ERROR_MESSAGES, getUserMessage, getStatusMessage } from '~/lib/errors';

describe('Error Messages', () => {
  describe('ERROR_MESSAGES mapping', () => {
    it('should have TOKEN_INVALIDO mapped', () => {
      expect(ERROR_MESSAGES.TOKEN_INVALIDO).toContain('Token inválido');
    });

    it('should have VALIDACION_FALLIDA mapped', () => {
      expect(ERROR_MESSAGES.VALIDACION_FALLIDA).toContain('verificar tu identidad');
    });

    it('should have TIMEOUT mapped', () => {
      expect(ERROR_MESSAGES.TIMEOUT).toContain('Conexión lenta');
    });

    it('should have NETWORK_ERROR mapped', () => {
      expect(ERROR_MESSAGES.NETWORK_ERROR).toContain('Error de conexión');
    });

    it('should have HTTP status codes mapped', () => {
      expect(ERROR_MESSAGES['401']).toContain('No autorizado');
      expect(ERROR_MESSAGES['500']).toContain('Error en el servidor');
    });
  });

  describe('getUserMessage', () => {
    it('should map known error codes to messages', () => {
      const message = getUserMessage('TOKEN_INVALIDO');
      expect(message).toBe(ERROR_MESSAGES.TOKEN_INVALIDO);
    });

    it('should return error message from Error object', () => {
      const error = new Error('TEST_ERROR');
      const message = getUserMessage(error);
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    it('should return default message for unknown errors', () => {
      const message = getUserMessage('unknown error');
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });

    it('should return custom error message if short', () => {
      const customMessage = 'Custom error from backend';
      const message = getUserMessage(customMessage);
      expect(message).toBe(customMessage);
    });
  });

  describe('getStatusMessage', () => {
    it('should map HTTP status codes', () => {
      expect(getStatusMessage(401)).toBe(ERROR_MESSAGES['401']);
      expect(getStatusMessage(500)).toBe(ERROR_MESSAGES['500']);
    });

    it('should provide fallback for unknown status codes', () => {
      const message = getStatusMessage(999);
      expect(message).toContain('Error');
    });
  });
});
