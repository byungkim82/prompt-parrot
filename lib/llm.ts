export type LLMProvider = 'gemini' | 'claude';

export interface LLMConfig {
  provider: LLMProvider;
  displayName: string;
  gatewayPath: string; // suffix after base gateway URL
}

export interface LLMCallParams {
  provider: LLMProvider;
  prompt: string;
  gatewayBaseUrl: string;
  apiKeys: {
    gemini?: string;
    anthropic?: string;
  };
}

export interface LLMResult {
  text: string;
  model: string; // actual model identifier used
}

// Gemini response shape
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// Claude response shape
interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
}

export const MODEL_CONFIGS: Record<LLMProvider, LLMConfig> = {
  gemini: {
    provider: 'gemini',
    displayName: 'Gemini 2.5 Flash Lite',
    gatewayPath: 'google-ai-studio/v1/models/gemini-2.5-flash-lite:generateContent',
  },
  claude: {
    provider: 'claude',
    displayName: 'Claude Haiku',
    gatewayPath: 'anthropic/v1/messages',
  },
};

export async function callLLM(params: LLMCallParams): Promise<LLMResult> {
  const { provider, prompt, gatewayBaseUrl, apiKeys } = params;

  if (provider === 'gemini') {
    if (!apiKeys.gemini) {
      throw new Error('Gemini API key is required but not provided.');
    }

    const url = `${gatewayBaseUrl}/${MODEL_CONFIGS.gemini.gatewayPath}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKeys.gemini,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25000),
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        throw new Error('Gemini API request timed out after 25 seconds.');
      }
      throw new Error(`Gemini API request failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (response.status === 429) {
      throw new Error('Gemini API rate limit exceeded. Please try again later.');
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      throw new Error('Gemini API returned an empty result.');
    }

    return { text, model: 'gemini-2.5-flash-lite' };
  }

  if (provider === 'claude') {
    if (!apiKeys.anthropic) {
      throw new Error('Anthropic API key is required but not provided.');
    }

    const url = `${gatewayBaseUrl}/${MODEL_CONFIGS.claude.gatewayPath}`;
    const body = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }],
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKeys.anthropic,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25000),
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        throw new Error('Claude API request timed out after 25 seconds.');
      }
      throw new Error(`Claude API request failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (response.status === 429) {
      throw new Error('Claude API rate limit exceeded. Please try again later.');
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Claude API returned status ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as ClaudeResponse;
    const text = data?.content?.[0]?.text?.trim();

    if (!text) {
      throw new Error('Claude API returned an empty result.');
    }

    return { text, model: 'claude-haiku-4-5-20251001' };
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}

export function getAvailableModels(apiKeys: { gemini?: string; anthropic?: string }): Array<{ id: LLMProvider; name: string; available: boolean }> {
  return Object.values(MODEL_CONFIGS).map(config => ({
    id: config.provider,
    name: config.displayName,
    available: config.provider === 'gemini' ? !!apiKeys.gemini : !!apiKeys.anthropic,
  }));
}
