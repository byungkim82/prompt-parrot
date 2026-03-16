import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '@/app/components/ToastProvider';
import { renderHook } from '@testing-library/react';

// Test component that triggers toast
function ToastTrigger({ message, type }: { message: string; type: 'success' | 'error' }) {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast({ message, type })}>
      Show Toast
    </button>
  );
}

describe('ToastProvider', () => {
  it('renders children', () => {
    render(
      <ToastProvider>
        <div>Child content</div>
      </ToastProvider>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('shows toast when showToast is called', async () => {
    render(
      <ToastProvider>
        <ToastTrigger message="성공!" type="success" />
      </ToastProvider>
    );

    await userEvent.click(screen.getByText('Show Toast'));
    expect(screen.getByText('성공!')).toBeInTheDocument();
  });

  it('replaces previous toast on consecutive calls', async () => {
    function MultiToastTrigger() {
      const { showToast } = useToast();
      return (
        <>
          <button onClick={() => showToast({ message: '첫 번째', type: 'success' })}>First</button>
          <button onClick={() => showToast({ message: '두 번째', type: 'error' })}>Second</button>
        </>
      );
    }

    render(
      <ToastProvider>
        <MultiToastTrigger />
      </ToastProvider>
    );

    await userEvent.click(screen.getByText('First'));
    expect(screen.getByText('첫 번째')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Second'));
    expect(screen.getByText('두 번째')).toBeInTheDocument();
    expect(screen.queryByText('첫 번째')).not.toBeInTheDocument();
  });
});

describe('useToast', () => {
  it('throws when used outside ToastProvider', () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useToast());
    }).toThrow('useToast must be used within ToastProvider');

    spy.mockRestore();
  });
});
