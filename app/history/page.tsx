'use client';

import { useHistory, Translation } from '../hooks/useHistory';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-8 h-8 flex items-center justify-center rounded-md
                 border border-slate-200 dark:border-slate-700
                 bg-white dark:bg-slate-800
                 text-slate-500 dark:text-slate-400
                 hover:text-slate-700 dark:hover:text-slate-200
                 hover:border-slate-300 dark:hover:border-slate-600
                 transition-colors duration-150"
    >
      {isDark ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

export default function HistoryPage() {
  const [modelFilter, setModelFilter] = useState<string>('');
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useHistory(modelFilter || undefined);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // 무한 스크롤
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleCopy = async (translation: Translation) => {
    try {
      const textToCopy = translation.edited_english_text || translation.english_text;
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(translation.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast({ message: '클립보드 복사 실패', type: 'error' });
    }
  };

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/history?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        showToast({ message: '삭제 실패', type: 'error' });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['translations'] });
    } catch (error) {
      showToast({ message: '삭제 실패', type: 'error' });
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleExportCSV = () => {
    const allTranslations = data?.pages.flat() || [];

    const csvContent = [
      ['ID', '생성일', '한국어', '영어(원본)', '영어(편집)', '편집여부'].join(','),
      ...allTranslations.map(t =>
        [
          t.id,
          t.created_at,
          `"${t.korean_text.replace(/"/g, '""')}"`,
          `"${t.english_text.replace(/"/g, '""')}"`,
          `"${(t.edited_english_text || '').replace(/"/g, '""')}"`,
          t.is_edited ? 'TRUE' : 'FALSE',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `translations-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const pageShell = (content: React.ReactNode) => (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117] p-4 md:p-8 transition-colors duration-200">
      <div className="max-w-2xl mx-auto">{content}</div>
    </div>
  );

  if (isError) {
    return pageShell(
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white dark:bg-[#161b22]
                        border border-slate-200 dark:border-[#30363d]
                        rounded-lg p-8 text-center max-w-sm w-full">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-md flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-slate-700 dark:text-slate-300 font-medium text-sm mb-1">히스토리를 불러오지 못했습니다</p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mb-5">네트워크 연결을 확인하고 다시 시도해주세요.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-500 dark:bg-indigo-600 text-white rounded-md text-sm font-medium
                       hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors duration-150"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return pageShell(
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2.5 text-slate-400 dark:text-slate-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-mono">로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117] p-4 md:p-8 transition-colors duration-200">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5
                         border border-slate-200 dark:border-slate-700
                         bg-white dark:bg-slate-800
                         text-slate-600 dark:text-slate-400
                         hover:text-slate-900 dark:hover:text-slate-200
                         hover:border-slate-300 dark:hover:border-slate-600
                         rounded-md text-sm font-medium
                         transition-colors duration-150"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              번역하기
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                번역 히스토리
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5
                         border border-slate-200 dark:border-slate-700
                         bg-white dark:bg-slate-800
                         text-slate-600 dark:text-slate-400
                         hover:text-slate-900 dark:hover:text-slate-200
                         hover:border-slate-300 dark:hover:border-slate-600
                         px-3 py-1.5 rounded-md text-sm font-medium
                         transition-colors duration-150"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV 내보내기
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
            모델
          </span>
          <div className="flex gap-1.5">
            {['', 'gemini-2.5-flash-lite', 'claude-haiku-4-5-20251001'].map((model) => (
              <button
                key={model}
                onClick={() => setModelFilter(model)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors duration-150 border
                  ${modelFilter === model
                    ? 'bg-indigo-500 dark:bg-indigo-600 text-white border-indigo-500 dark:border-indigo-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
              >
                {model === '' ? '전체' : model === 'gemini-2.5-flash-lite' ? 'Gemini' : 'Claude'}
              </button>
            ))}
          </div>
        </div>

        {/* History List */}
        <div className="space-y-3">
          {data?.pages.map((page, i) => (
            <div key={i}>
              {page.map((translation) => (
                <div
                  key={translation.id}
                  className="bg-white dark:bg-[#161b22]
                             border border-slate-200 dark:border-[#30363d]
                             hover:border-slate-300 dark:hover:border-[#484f58]
                             rounded-lg p-4 mb-3
                             transition-colors duration-150"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-mono">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(translation.created_at).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {translation.llm_used && (
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono border border-slate-200 dark:border-slate-700">
                          {translation.llm_used === 'gemini-2.5-flash-lite' ? 'Gemini' : translation.llm_used === 'claude-haiku-4-5-20251001' ? 'Claude' : translation.llm_used}
                        </span>
                      )}
                      {translation.is_edited === 1 && (
                        <span className="flex items-center gap-1 text-xs
                                         bg-amber-100 dark:bg-amber-900/30
                                         text-amber-700 dark:text-amber-400
                                         border border-amber-200 dark:border-amber-800
                                         px-2 py-0.5 rounded font-medium">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          편집됨
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Korean Text */}
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono mb-1.5">
                      Korean
                    </div>
                    <p className="text-slate-700 dark:text-slate-300
                                  bg-slate-50 dark:bg-slate-900
                                  border border-slate-100 dark:border-slate-800
                                  p-2.5 rounded-md text-sm leading-relaxed whitespace-pre-wrap">
                      {translation.korean_text.length > 200
                        ? translation.korean_text.substring(0, 200) + '...'
                        : translation.korean_text}
                    </p>
                  </div>

                  {/* English Text */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono mb-1.5">
                      English
                    </div>
                    <p className="code-result p-2.5 rounded-md text-sm leading-relaxed whitespace-pre-wrap">
                      {(
                        translation.edited_english_text || translation.english_text
                      ).length > 200
                        ? (translation.edited_english_text || translation.english_text)
                            .substring(0, 200) + '...'
                        : translation.edited_english_text || translation.english_text}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(translation)}
                      className={`flex-1 py-1.5 rounded-md font-medium text-xs transition-colors duration-150 flex items-center justify-center gap-1.5
                        ${copiedId === translation.id
                          ? 'bg-emerald-500 dark:bg-emerald-600 text-white'
                          : 'bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-500'}`}
                    >
                      {copiedId === translation.id ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          복사됨!
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          복사
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(translation.id)}
                      className="px-3 py-1.5 rounded-md font-medium text-xs
                                 bg-slate-100 dark:bg-slate-800
                                 text-slate-500 dark:text-slate-400
                                 hover:bg-red-50 dark:hover:bg-red-900/20
                                 hover:text-red-600 dark:hover:text-red-400
                                 border border-slate-200 dark:border-slate-700
                                 hover:border-red-200 dark:hover:border-red-900
                                 transition-colors duration-150
                                 flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Infinite Scroll Trigger */}
        <div ref={loadMoreRef} className="py-8 text-center">
          {isFetchingNextPage && (
            <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs font-mono">불러오는 중...</span>
            </div>
          )}
          {!hasNextPage && data?.pages.length !== 0 && data?.pages[0]?.length !== 0 && (
            <p className="text-slate-400 dark:text-slate-600 text-xs font-mono">
              — 모든 히스토리를 불러왔습니다 —
            </p>
          )}
          {(data?.pages.length === 0 || data?.pages[0]?.length === 0) && (
            <div className="bg-white dark:bg-[#161b22]
                            border border-slate-200 dark:border-[#30363d]
                            rounded-lg p-8 text-center">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center mx-auto mb-4">
                <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium text-sm mb-1">저장된 히스토리가 없습니다</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs">번역 후 저장하면 여기에 표시됩니다.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-4 text-center text-xs text-slate-400 dark:text-slate-600 font-mono">
          Powered by Gemini &amp; Claude
        </footer>
      </div>

      {deleteTargetId !== null && (
        <ConfirmModal
          message="정말 삭제하시겠습니까?"
          onConfirm={() => handleDelete(deleteTargetId)}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}
    </div>
  );
}
