import { NextRequest, NextResponse } from 'next/server';

interface TranslateRequest {
  koreanText: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const { koreanText }: TranslateRequest = await request.json();

    if (!koreanText || koreanText.trim().length === 0) {
      return NextResponse.json(
        { error: '한국어 텍스트를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Get Gemini API key from environment
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다. wrangler secret put GEMINI_API_KEY를 실행하세요.' },
        { status: 500 }
      );
    }

    // LLM 프롬프트 최적화 전용 번역 프롬프트
    const prompt = `You are a professional translator specializing in optimizing Korean text for use as prompts in Large Language Models (LLMs) like Claude, GPT, and Gemini.

Translate the following Korean text to English with these guidelines:
1. Maintain technical accuracy and clarity
2. Use natural, professional English suitable for AI interactions
3. Preserve the intent and nuance of the original Korean text
4. Optimize phrasing for maximum effectiveness as an LLM prompt
5. Do not add explanations or commentary - only provide the translated text

Korean text:
${koreanText}

English translation:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,  // 낮은 온도로 일관성 향상
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      throw new Error('번역 API 호출 실패');
    }

    const data: GeminiResponse = await response.json();
    const englishText = data.candidates[0]?.content?.parts[0]?.text;

    if (!englishText) {
      throw new Error('번역 결과를 받지 못했습니다.');
    }

    return NextResponse.json({ englishText: englishText.trim() });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: '번역 중 오류가 발생했습니다. 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
