import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from './App';
import * as api from './lib/api';

vi.mock('./lib/api');

describe('App component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header, title, and connected badge on successful health check', async () => {
    vi.mocked(api.checkHealth).mockResolvedValueOnce({
      status: 'ok',
      version: '0.1.0',
      service: 'signbridge-backend',
    });

    render(<App />);

    expect(screen.getByText('SignBridge')).toBeInTheDocument();
    expect(screen.getByTestId('backend-status-badge')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    expect(screen.getByTestId('backend-status-badge')).toHaveClass('bg-emerald-950/80');
    expect(screen.getByText(/Speech → ASL/)).toBeInTheDocument();
  });

  it('displays offline badge on failed health check', async () => {
    vi.mocked(api.checkHealth).mockRejectedValueOnce(new Error('Network error'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    expect(screen.getByTestId('backend-status-badge')).toHaveClass('bg-rose-950/80');
  });

  it('renders navigation buttons for CV Studio and Player test view', async () => {
    vi.mocked(api.checkHealth).mockResolvedValueOnce({
      status: 'ok',
      version: '0.1.0',
      service: 'signbridge-backend',
    });

    render(<App />);

    expect(screen.getByText('CV Studio')).toBeInTheDocument();
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByTitle(/Toggle Debug Overlay/i)).toBeInTheDocument();
  });
});
