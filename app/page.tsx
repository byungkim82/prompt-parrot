'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useToast } from './components/ToastProvider';

export default function Home() {
  const [koreanText, setKoreanText] = useState('');
  const [englishText, setEnglishText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

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
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || '번역 실패');
      }

      const data = await response.json() as { englishText: string };
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
      showToast({ message: '저장되었습니다!', type: 'success' });
    } catch (err) {
      showToast({ message: '저장 실패', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <span className="text-2xl">🦜</span>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Prompt Parrot
              </h1>
              <p className="text-sm text-slate-500">한국어 프롬프트 번역기</p>
            </div>
          </div>
          <Link
            href="/history"
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span className="text-lg">📚</span>
            <span className="font-medium">히스토리</span>
          </Link>
        </header>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 md:p-8 border border-slate-100">
          {/* Korean Input */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-base font-semibold text-slate-700 mb-3">
              <span className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center text-sm">🇰🇷</span>
              한국어 입력
            </label>
            <textarea
              className="w-full p-4 border-2 border-slate-200 rounded-2xl h-44 resize-none
                         focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50
                         bg-slate-50 text-slate-800 placeholder-slate-400
                         transition-all duration-200"
              placeholder="번역할 한국어 프롬프트를 입력하세요..."
              value={koreanText}
              onChange={(e) => setKoreanText(e.target.value)}
            />
          </div>

          {/* Translate Button */}
          <button
            onClick={handleTranslate}
            disabled={isLoading || !koreanText.trim()}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-2xl
                       font-semibold text-lg
                       hover:from-indigo-600 hover:to-purple-700
                       disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed
                       transition-all duration-200 shadow-lg shadow-indigo-200
                       hover:shadow-xl hover:shadow-indigo-300
                       disabled:shadow-none
                       flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                번역 중...
              </>
            ) : (
              <>
                번역하기
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-red-700 font-medium">{error}</p>
                <button
                  onClick={handleTranslate}
                  className="mt-2 text-red-600 font-medium hover:text-red-800 underline underline-offset-2"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}

          {/* English Result */}
          {englishText && (
            <div className="mt-8 pt-8 border-t-2 border-slate-100">
              <div className="flex justify-between items-center mb-3">
                <label className="flex items-center gap-2 text-base font-semibold text-slate-700">
                  <span className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center text-sm">🇺🇸</span>
                  영어 번역 결과
                </label>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${isEditing
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600'}`}
                >
                  <span>{isEditing ? '✏️' : '📝'}</span>
                  {isEditing ? '편집 중' : '편집하기'}
                </button>
              </div>

              {isEditing ? (
                <textarea
                  className="w-full p-4 border-2 border-amber-200 rounded-2xl h-44 resize-none
                             focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-50
                             bg-amber-50 text-slate-800
                             transition-all duration-200"
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                />
              ) : (
                <div className="w-full p-4 border-2 border-emerald-200 rounded-2xl bg-emerald-50 text-slate-800 whitespace-pre-wrap min-h-[120px]">
                  {editedText}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleCopy}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2
                    ${copied
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300'}`}
                >
                  {copied ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      복사됨!
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      클립보드에 복사
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-slate-700 text-white py-3 rounded-xl font-semibold
                             hover:bg-slate-800 transition-all duration-200
                             shadow-lg shadow-slate-300 hover:shadow-xl hover:shadow-slate-400
                             flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  저장
                </button>
              </div>
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
