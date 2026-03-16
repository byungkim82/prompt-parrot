import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { Toast } from '@/app/components/Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const defaultProps = {
    id: '1',
    message: '저장되었습니다!',
    type: 'success' as const,
    duration: 3000,
    onClose: vi.fn(),
  };

  it('renders success toast with message', () => {
    render(<Toast {...defaultProps} />);
    expect(screen.getByText('저장되었습니다!')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders error toast', () => {
    render(<Toast {...defaultProps} type="error" message="에러 발생" />);
    expect(screen.getByText('에러 발생')).toBeInTheDocument();
  });

  it('auto-dismisses after duration', () => {
    const onClose = vi.fn();
    render(<Toast {...defaultProps} onClose={onClose} duration={3000} />);

    // After 3000ms, handleClose sets isExiting=true
    act(() => vi.advanceTimersByTime(3000));

    // After 200ms more, onClose is called
    act(() => vi.advanceTimersByTime(200));

    expect(onClose).toHaveBeenCalledWith('1');
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();
    render(<Toast {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('닫기'));

    // Wait for the 200ms exit animation
    act(() => vi.advanceTimersByTime(200));

    expect(onClose).toHaveBeenCalledWith('1');
  });

  it('has correct ARIA attributes', () => {
    render(<Toast {...defaultProps} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
  });

  it('uses custom duration', () => {
    const onClose = vi.fn();
    render(<Toast {...defaultProps} onClose={onClose} duration={1000} />);

    act(() => vi.advanceTimersByTime(1000));
    act(() => vi.advanceTimersByTime(200));

    expect(onClose).toHaveBeenCalledWith('1');
  });
});
