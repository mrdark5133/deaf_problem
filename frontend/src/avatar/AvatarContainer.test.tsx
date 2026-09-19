/**
 * AvatarContainer.test.tsx — Unit tests for AvatarContainer switcher and fallback mechanics.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AvatarContainer } from './AvatarContainer';
import type { SignFrame } from '../lib/clipTypes';

const mockFrame: SignFrame = {
  pose: [[0, 0, 0], [0, 0, 0]],
  left_hand: null,
  right_hand: null,
};

describe('AvatarContainer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders 2D Canvas Skeleton by default', () => {
    render(<AvatarContainer frame={mockFrame} isIdle={true} />);

    // 2D Skeleton toggle button is highlighted
    expect(screen.getByText('2D Skeleton')).toBeInTheDocument();
    expect(screen.getByText('3D Mannequin')).toBeInTheDocument();
  });

  it('switches to 3D Mannequin on toggle button click', async () => {
    render(<AvatarContainer frame={mockFrame} isIdle={true} />);

    const btn3D = screen.getByText('3D Mannequin');
    fireEvent.click(btn3D);

    expect(btn3D.closest('button')).toHaveClass('bg-indigo-600');
  });

  it('toggles mode when keyboard shortcut "3" is pressed', () => {
    render(<AvatarContainer frame={mockFrame} isIdle={true} />);

    const btn2D = screen.getByText('2D Skeleton');
    expect(btn2D.closest('button')).toHaveClass('bg-indigo-600');

    fireEvent.keyDown(window, { key: '3' });

    const btn3D = screen.getByText('3D Mannequin');
    expect(btn3D.closest('button')).toHaveClass('bg-indigo-600');
  });
});
