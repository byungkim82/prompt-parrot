'use client';

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-slate-700 font-medium text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-medium text-sm bg-slate-100 text-slate-600
                       hover:bg-slate-200 transition-all duration-200"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl font-medium text-sm bg-red-500 text-white
                       hover:bg-red-600 transition-all duration-200 shadow-md shadow-red-200"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
