'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from './components/ToastProvider';

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

export default function Home() {
  const [koreanText, setKoreanText] = useState('');
  const [englishText, setEnglishText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'claude'>('gemini');
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string; available: boolean }>>([]);
  const [usedModel, setUsedModel] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json() as Promise<{ models: Array<{ id: string; name: string; available: boolean }> }>)
      .then((data) => {
        setAvailableModels(data.models);
      })
      .catch(() => {});
  }, []);

  const handleTranslate = async () => {
    if (!koreanText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ koreanText, model: selectedModel }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || '번역 실패');
      }

      const data = await response.json() as { englishText: string; model: string };
      setEnglishText(data.englishText);
      setEditedText(data.englishText);
      setUsedModel(data.model);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '번역 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      const textToCopy = isEditing ? editedText : englishText;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ message: '클립보드 복사 실패', type: 'error' });
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          koreanText,
          englishText,
          editedEnglishText: editedText !== englishText ? editedText : null,
          llmUsed: usedModel,
        }),
      });
      if (!response.ok) {
        showToast({ message: '저장 실패', type: 'error' });
        return;
      }
      showToast({ message: '저장되었습니다!', type: 'success' });
    } catch (err) {
      showToast({ message: '저장 실패', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117] p-4 md:p-8 transition-colors duration-200">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 dark:bg-indigo-600 rounded-md flex items-center justify-center">
              <span className="text-base leading-none">🦜</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Prompt Parrot
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                ko → en · llm-optimized
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/history"
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              히스토리
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Main Card */}
        <div className="bg-white dark:bg-[#161b22]
                        border border-slate-200 dark:border-[#30363d]
                        rounded-lg p-5 md:p-6">

          {/* Korean Input */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                입력 · Korean
              </label>
              <span className="text-xs text-slate-400 dark:text-slate-600 font-mono">
                {koreanText.length}/4000
              </span>
            </div>
            <div className="relative">
              <textarea
                className="w-full p-3 pr-10
                           border border-slate-200 dark:border-slate-700
                           rounded-md h-40 resize-none
                           focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500
                           focus:ring-2 focus:ring-indigo-400/20 dark:focus:ring-indigo-500/20
                           bg-slate-50 dark:bg-slate-900
                           text-slate-800 dark:text-slate-200
                           placeholder-slate-400 dark:placeholder-slate-600
                           text-sm leading-relaxed
                           transition-colors duration-150"
                placeholder="번역할 한국어 프롬프트를 입력하세요..."
                value={koreanText}
                onChange={(e) => setKoreanText(e.target.value)}
                maxLength={4000}
              />
              {koreanText.length > 0 && (
                <button
                  type="button"
                  onClick={() => setKoreanText('')}
                  aria-label="Clear input"
                  className="absolute top-2 right-2 w-6 h-6 rounded
                             text-slate-400 dark:text-slate-600
                             hover:text-slate-600 dark:hover:text-slate-400
                             hover:bg-slate-100 dark:hover:bg-slate-800
                             transition-colors duration-150
                             flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Model Selector */}
          <div className="flex gap-2 mb-4">
            {availableModels.length > 0 ? (
              availableModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => model.available && setSelectedModel(model.id as 'gemini' | 'claude')}
                  disabled={!model.available}
                  title={!model.available ? 'API 키가 설정되지 않았습니다' : model.name}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors duration-150 border
                    ${selectedModel === model.id
                      ? 'bg-indigo-500 dark:bg-indigo-600 text-white border-indigo-500 dark:border-indigo-600'
                      : model.available
                        ? 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-50'
                    }`}
                >
                  {model.name}
                </button>
              ))
            ) : (
              <>
                <div className="flex-1 py-2 px-3 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white text-sm font-medium border border-indigo-500 dark:border-indigo-600 text-center">
                  Gemini 2.5 Flash Lite
                </div>
                <div className="flex-1 py-2 px-3 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 text-sm font-medium border border-slate-200 dark:border-slate-800 text-center animate-pulse">
                  Loading...
                </div>
              </>
            )}
          </div>

          {/* Translate Button */}
          <button
            onClick={handleTranslate}
            disabled={isLoading || !koreanText.trim()}
            className="w-full bg-indigo-500 dark:bg-indigo-600 text-white
                       py-2.5 rounded-md
                       font-semibold text-sm
                       hover:bg-indigo-600 dark:hover:bg-indigo-500
                       disabled:bg-slate-200 dark:disabled:bg-slate-800
                       disabled:text-slate-400 dark:disabled:text-slate-600
                       disabled:cursor-not-allowed
                       transition-colors duration-150
                       flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                번역 중...
              </>
            ) : (
              <>
                번역하기
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>

          {/* Error Display */}
          {error && (
            <div className="mt-4 bg-red-50 dark:bg-red-950/30
                            border border-red-200 dark:border-red-900
                            rounded-md p-3 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
                <button
                  onClick={handleTranslate}
                  className="mt-1 text-red-600 dark:text-red-400 text-xs font-medium hover:underline"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}

          {/* English Result */}
          {englishText && (
            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                    출력 · English
                  </label>
                  {usedModel && (
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono border border-slate-200 dark:border-slate-700">
                      {usedModel}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors duration-150
                    ${isEditing
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {isEditing ? '편집 중' : '편집하기'}
                </button>
              </div>

              {isEditing ? (
                <textarea
                  className="w-full p-3
                             border border-amber-300 dark:border-amber-700
                             rounded-md h-40 resize-none
                             focus:outline-none focus:border-amber-400 dark:focus:border-amber-500
                             focus:ring-2 focus:ring-amber-400/20
                             bg-amber-50 dark:bg-amber-950/20
                             text-slate-800 dark:text-slate-200
                             font-mono text-sm leading-relaxed
                             transition-colors duration-150"
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                />
              ) : (
                <div className="code-result w-full p-3 rounded-md whitespace-pre-wrap min-h-[80px] text-sm">
                  {editedText}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCopy}
                  className={`flex-1 py-2 rounded-md font-medium text-sm transition-colors duration-150 flex items-center justify-center gap-1.5
                    ${copied
                      ? 'bg-emerald-500 dark:bg-emerald-600 text-white'
                      : 'bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-500'}`}
                >
                  {copied ? (
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
                      클립보드에 복사
                    </>
                  )}
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-slate-700 dark:bg-slate-700 text-white
                             py-2 rounded-md font-medium text-sm
                             hover:bg-slate-600 dark:hover:bg-slate-600
                             transition-colors duration-150
                             flex items-center justify-center gap-1.5
                             border border-slate-600 dark:border-slate-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  저장
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-6 text-center text-xs text-slate-400 dark:text-slate-600 font-mono">
          Powered by Gemini & Claude
        </footer>
      </div>
    </div>
  );
}
