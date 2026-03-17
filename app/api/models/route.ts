import { NextResponse } from 'next/server';
import { getAvailableModels } from '@/lib/llm';

export async function GET() {
  const models = getAvailableModels({
    gemini: process.env.GEMINI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  });

  return NextResponse.json({ models });
}
