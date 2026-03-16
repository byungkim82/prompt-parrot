'use client';

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-[#161b22]
                   border border-slate-200 dark:border-[#30363d]
                   rounded-lg shadow-2xl shadow-black/20 dark:shadow-black/50
                   p-5 max-w-xs w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-slate-700 dark:text-slate-300 text-sm font-medium text-center mb-5">
          {message}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-md font-medium text-sm
                       bg-slate-100 dark:bg-slate-800
                       text-slate-600 dark:text-slate-400
                       border border-slate-200 dark:border-slate-700
                       hover:bg-slate-200 dark:hover:bg-slate-700
                       transition-colors duration-150"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-md font-medium text-sm
                       bg-red-500 dark:bg-red-600 text-white
                       hover:bg-red-600 dark:hover:bg-red-500
                       transition-colors duration-150"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
