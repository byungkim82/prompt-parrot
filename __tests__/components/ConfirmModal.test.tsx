import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmModal from '@/app/components/ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    message: '정말 삭제하시겠습니까?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders message', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('정말 삭제하시겠습니까?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByText('삭제'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

    await userEvent.click(screen.getByText('취소'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel when backdrop is clicked', async () => {
    const onCancel = vi.fn();
    const { container } = render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

    // Click the outer backdrop div (first child)
    await userEvent.click(container.firstChild as Element);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not call onCancel when inner modal content is clicked', async () => {
    const onCancel = vi.fn();
    render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

    // Click the message text (inside the inner div)
    await userEvent.click(screen.getByText('정말 삭제하시겠습니까?'));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
