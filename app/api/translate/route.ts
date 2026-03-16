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

    if (koreanText.length > 5000) {
      return NextResponse.json(
        { error: '입력 텍스트가 너무 깁니다. (최대 5,000자)' },
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
    const prompt = `You are a professional prompt engineer and expert translator. Your task is to translate Korean LLM instructions into high-quality English prompts.

### Translation Guidelines:
1. **Model Neutrality**: Use terminology that works universally across Claude, GPT, and Gemini.
2. **Precision & Imperative**: Use strong, action-oriented verbs (e.g., "Analyze", "Synthesize", "Construct") instead of passive phrasing.
3. **Context Preservation**: Ensure technical nuances (especially in software or logic) are perfectly preserved.
4. **Prompt Optimization**: Structure the English output to be concise and instruction-heavy, which reduces token usage and improves LLM adherence.

### Constraints:
- Provide ONLY the translated English text.
- No conversational filler, no explanations, no preamble.
- Maintain the original markdown formatting if present.

---
**Korean Text to Translate:**
${koreanText}

**English Translation:**`;

    const response = await fetch(
      `https://gateway.ai.cloudflare.com/v1/c20598b7e5410e23541b2f02ee4c9478/prompt-parrot/google-ai-studio/v1/models/gemini-2.5-flash-lite:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,  // 낮은 온도로 일관성 향상
            maxOutputTokens: 4096,
          },
        }),
        signal: AbortSignal.timeout(25000),
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
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: '번역 요청 시간이 초과되었습니다. 다시 시도해주세요.' },
        { status: 504 }
      );
    }
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: '번역 중 오류가 발생했습니다. 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
