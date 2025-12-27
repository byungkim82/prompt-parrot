'use client';

import { useHistory, Translation } from '../hooks/useHistory';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function HistoryPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useHistory();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

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
    const textToCopy = translation.edited_english_text || translation.english_text;
    await navigator.clipboard.writeText(textToCopy);
    setCopiedId(translation.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await fetch(`/api/history?id=${id}`, {
        method: 'DELETE',
      });
      window.location.reload(); // 간단하게 새로고침
    } catch (error) {
      alert('삭제 실패');
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3 text-slate-500">
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="font-medium">로딩 중...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">번역하기</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <span className="text-lg">📚</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                번역 히스토리
              </h1>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium
                       hover:from-indigo-600 hover:to-purple-700
                       transition-all duration-200 shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV 내보내기
          </button>
        </header>

        {/* History List */}
        <div className="space-y-4">
          {data?.pages.map((page, i) => (
            <div key={i}>
              {page.map((translation) => (
                <div
                  key={translation.id}
                  className="bg-white p-5 md:p-6 rounded-2xl shadow-lg shadow-slate-200/50 mb-4
                             border border-slate-100 hover:border-indigo-200
                             transition-all duration-200 hover:shadow-xl hover:shadow-slate-200/50"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    {translation.is_edited === 1 && (
                      <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg font-medium">
                        <span>✏️</span>
                        편집됨
                      </span>
                    )}
                  </div>

                  {/* Korean Text */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 bg-indigo-100 rounded-md flex items-center justify-center text-xs">🇰🇷</span>
                      <span className="font-semibold text-slate-700 text-sm">한국어</span>
                    </div>
                    <p className="text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl text-sm leading-relaxed">
                      {translation.korean_text.length > 200
                        ? translation.korean_text.substring(0, 200) + '...'
                        : translation.korean_text}
                    </p>
                  </div>

                  {/* English Text */}
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 bg-emerald-100 rounded-md flex items-center justify-center text-xs">🇺🇸</span>
                      <span className="font-semibold text-slate-700 text-sm">영어</span>
                    </div>
                    <p className="text-slate-800 whitespace-pre-wrap bg-emerald-50 p-3 rounded-xl text-sm leading-relaxed">
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
                      className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2
                        ${copiedId === translation.id
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-200 hover:shadow-lg'}`}
                    >
                      {copiedId === translation.id ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          복사됨!
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          복사
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(translation.id)}
                      className="bg-red-500 text-white px-4 py-2.5 rounded-xl font-medium text-sm
                                 hover:bg-red-600 transition-all duration-200
                                 shadow-md shadow-red-200 hover:shadow-lg
                                 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="font-medium">불러오는 중...</span>
            </div>
          )}
          {!hasNextPage && data?.pages.length !== 0 && data?.pages[0]?.length !== 0 && (
            <p className="text-slate-400 text-sm">모든 히스토리를 불러왔습니다.</p>
          )}
          {(data?.pages.length === 0 || data?.pages[0]?.length === 0) && (
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-8 text-center border border-slate-100">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📭</span>
              </div>
              <p className="text-slate-600 font-medium mb-2">저장된 히스토리가 없습니다</p>
              <p className="text-slate-400 text-sm">번역 후 저장하면 여기에 표시됩니다.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-slate-400">
          Powered by Gemini 2.5 Flash
        </footer>
      </div>
    </div>
  );
}
