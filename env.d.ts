/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  DB: D1Database;
  GEMINI_API_KEY: string;
}

declare module 'cloudflare:test' {
  interface ProvidedEnv extends CloudflareEnv {}
}
