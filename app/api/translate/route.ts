import { NextRequest, NextResponse } from 'next/server';
import { callLLM, LLMProvider } from '@/lib/llm';

interface TranslateRequest {
  koreanText: string;
  model?: LLMProvider;
}

const VALID_MODELS: LLMProvider[] = ['gemini', 'claude'];

export async function POST(request: NextRequest) {
  try {
    const { koreanText, model = 'gemini' }: TranslateRequest = await request.json();

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

    if (!VALID_MODELS.includes(model)) {
      return NextResponse.json(
        { error: `지원하지 않는 모델입니다: ${model}` },
        { status: 400 }
      );
    }

    const gatewayBaseUrl = process.env.CF_AI_GATEWAY_URL;
    if (!gatewayBaseUrl) {
      return NextResponse.json(
        { error: 'AI Gateway URL이 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

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

    const result = await callLLM({
      provider: model,
      prompt,
      gatewayBaseUrl,
      apiKeys: {
        gemini: process.env.GEMINI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
      },
    });

    return NextResponse.json({ englishText: result.text, model: result.model });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Translation error:', message);

    if (message.includes('rate limit')) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    if (message.includes('timed out')) {
      return NextResponse.json(
        { error: '번역 요청 시간이 초과되었습니다. 다시 시도해주세요.' },
        { status: 504 }
      );
    }

    if (message.includes('API key is required')) {
      return NextResponse.json(
        { error: '해당 모델의 API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: '번역 중 오류가 발생했습니다. 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
