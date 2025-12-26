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
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center">⏳ 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-blue-600 hover:underline"
            >
              ← 번역하기
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold">📚 번역 히스토리</h1>
          </div>
          <button
            onClick={handleExportCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg
                       hover:bg-blue-700 transition-colors"
          >
            📥 CSV 내보내기
          </button>
        </div>

        {/* 히스토리 리스트 */}
        <div className="space-y-4">
          {data?.pages.map((page, i) => (
            <div key={i}>
              {page.map((translation) => (
                <div
                  key={translation.id}
                  className="bg-white p-4 md:p-6 rounded-lg shadow-sm mb-4
                             border border-gray-200 hover:border-blue-300
                             transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-sm text-gray-500">
                      🕐 {new Date(translation.created_at).toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {translation.is_edited === 1 && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        ✏️ 편집됨
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    <span className="font-semibold text-gray-700">KR:</span>
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                      {translation.korean_text.length > 200
                        ? translation.korean_text.substring(0, 200) + '...'
                        : translation.korean_text}
                    </p>
                  </div>

                  <div className="mb-4">
                    <span className="font-semibold text-gray-700">EN:</span>
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                      {(
                        translation.edited_english_text || translation.english_text
                      ).length > 200
                        ? (translation.edited_english_text || translation.english_text)
                            .substring(0, 200) + '...'
                        : translation.edited_english_text || translation.english_text}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(translation)}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg
                                 hover:bg-green-700 transition-colors text-sm"
                    >
                      {copiedId === translation.id ? '✓ 복사됨!' : '📋 복사'}
                    </button>
                    <button
                      onClick={() => handleDelete(translation.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg
                                 hover:bg-red-700 transition-colors text-sm"
                    >
                      🗑️ 삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* 무한 스크롤 트리거 */}
        <div ref={loadMoreRef} className="py-8 text-center">
          {isFetchingNextPage && (
            <p className="text-gray-500">🔄 불러오는 중...</p>
          )}
          {!hasNextPage && data?.pages.length !== 0 && (
            <p className="text-gray-500">모든 히스토리를 불러왔습니다.</p>
          )}
          {data?.pages.length === 0 && (
            <p className="text-gray-500">저장된 히스토리가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
