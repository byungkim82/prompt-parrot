'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [koreanText, setKoreanText] = useState('');
  const [englishText, setEnglishText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTranslate = async () => {
    if (!koreanText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ koreanText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '번역 실패');
      }

      const data = await response.json();
      setEnglishText(data.englishText);
      setEditedText(data.englishText);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '번역 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    const textToCopy = isEditing ? editedText : englishText;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          koreanText,
          englishText,
          editedEnglishText: editedText !== englishText ? editedText : null,
        }),
      });
      alert('저장되었습니다!');
    } catch (err) {
      alert('저장 실패');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">🦜 Prompt Parrot</h1>
          <Link
            href="/history"
            className="text-blue-600 hover:underline"
          >
            📚 히스토리
          </Link>
        </div>

        {/* 한국어 입력 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            한국어 입력
          </label>
          <textarea
            className="w-full p-4 border rounded-lg h-40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="번역할 한국어 프롬프트를 입력하세요..."
            value={koreanText}
            onChange={(e) => setKoreanText(e.target.value)}
          />
        </div>

        {/* 번역 버튼 */}
        <button
          onClick={handleTranslate}
          disabled={isLoading || !koreanText.trim()}
          className="w-full bg-blue-600 text-white py-3 rounded-lg
                     hover:bg-blue-700 disabled:bg-gray-400 mb-6
                     transition-colors"
        >
          {isLoading ? '⏳ 번역 중...' : '번역하기 🔄'}
        </button>

        {/* 에러 표시 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">❌ {error}</p>
            <button
              onClick={handleTranslate}
              className="mt-2 text-red-600 underline hover:text-red-800"
            >
              🔄 재시도
            </button>
          </div>
        )}

        {/* 영어 결과 */}
        {englishText && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">
                영어 번역 결과
              </label>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-sm text-blue-600 hover:underline"
              >
                {isEditing ? '📝 편집 중' : '✏️ 편집하기'}
              </button>
            </div>

            {isEditing ? (
              <textarea
                className="w-full p-4 border rounded-lg h-40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
              />
            ) : (
              <div className="w-full p-4 border rounded-lg bg-white whitespace-pre-wrap">
                {editedText}
              </div>
            )}

            {/* 복사 및 저장 버튼 */}
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleCopy}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg
                           hover:bg-green-700 transition-colors"
              >
                {copied ? '✓ 복사됨!' : '📋 클립보드에 복사'}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-gray-600 text-white py-2 rounded-lg
                           hover:bg-gray-700 transition-colors"
              >
                💾 저장
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
