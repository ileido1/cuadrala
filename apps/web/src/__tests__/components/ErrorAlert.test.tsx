import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorAlert } from '~/components/auth/ErrorAlert';

describe('ErrorAlert Component', () => {
  it('should render nothing when message is null', () => {
    const { container } = render(<ErrorAlert message={null} onDismiss={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render error message when provided', () => {
    const message = 'Test error message';
    render(<ErrorAlert message={message} onDismiss={vi.fn()} />);

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('should render with role alert', () => {
    render(<ErrorAlert message="Test error" onDismiss={vi.fn()} />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('should call onDismiss when close button is clicked', () => {
    const onDismiss = vi.fn();

    render(<ErrorAlert message="Test error" onDismiss={onDismiss} />);

    const closeButton = screen.getByLabelText('Cerrar');
    fireEvent.click(closeButton);

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('should display error icon', () => {
    render(<ErrorAlert message="Test error" onDismiss={vi.fn()} />);

    const svg = screen.getByRole('alert').querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should have proper styling classes', () => {
    const { container } = render(<ErrorAlert message="Test error" onDismiss={vi.fn()} />);

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveClass('bg-red-50', 'border-red-200', 'rounded-xl');
  });
});
