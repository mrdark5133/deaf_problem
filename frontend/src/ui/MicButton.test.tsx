import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MicButton } from './MicButton';

describe('MicButton', () => {
  it('renders idle state and triggers onToggle on click', () => {
    const onToggle = vi.fn();
    render(<MicButton status="idle" isListening={false} onToggle={onToggle} />);

    const button = screen.getByTestId('mic-button');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Press to speak')).toBeInTheDocument();

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders listening active state with pulsing indicator', () => {
    const onToggle = vi.fn();
    render(<MicButton status="listening" isListening={true} onToggle={onToggle} />);

    const button = screen.getByTestId('mic-button');
    expect(button).toHaveAttribute('data-status', 'listening');
    expect(screen.getByText('Listening...')).toBeInTheDocument();
  });

  it('renders denied state and disables when unsupported', () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <MicButton status="denied" isListening={false} onToggle={onToggle} />
    );
    expect(screen.getByText('Mic permission denied')).toBeInTheDocument();

    rerender(<MicButton status="unsupported" isListening={false} onToggle={onToggle} />);
    const button = screen.getByTestId('mic-button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Chrome/Edge required for mic')).toBeInTheDocument();
  });
});
