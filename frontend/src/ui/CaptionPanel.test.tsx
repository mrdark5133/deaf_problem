import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CaptionPanel } from './CaptionPanel';
import type { CaptionItem } from '../speech/types';

describe('CaptionPanel', () => {
  it('renders empty state placeholder when no captions exist', () => {
    render(<CaptionPanel captions={[]} />);
    expect(screen.getByText('No captions yet.')).toBeInTheDocument();
  });

  it('renders caption items and interim text', () => {
    const mockCaptions: CaptionItem[] = [
      {
        id: '1',
        text: 'Hello, how are you?',
        isFinal: true,
        source: 'speech',
        timestamp: Date.now(),
      },
      {
        id: '2',
        text: 'Where is doctor?',
        isFinal: true,
        source: 'typed',
        timestamp: Date.now(),
      },
    ];

    render(<CaptionPanel captions={mockCaptions} interimText="I need" />);

    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    expect(screen.getByText('Where is doctor?')).toBeInTheDocument();
    expect(screen.getByTestId('interim-caption')).toHaveTextContent('I need');
  });

  it('triggers onClear callback when Clear button is clicked', () => {
    const onClear = vi.fn();
    const mockCaptions: CaptionItem[] = [
      {
        id: '1',
        text: 'Test message',
        isFinal: true,
        source: 'typed',
        timestamp: Date.now(),
      },
    ];

    render(<CaptionPanel captions={mockCaptions} onClear={onClear} />);

    const clearBtn = screen.getByRole('button', { name: /clear caption history/i });
    fireEvent.click(clearBtn);

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
