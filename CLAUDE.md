# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prompt Parrot is a personal web application for translating Korean text into LLM-optimized English prompts. It's built with Next.js 15 and deployed to Cloudflare Workers using OpenNext, with translation history stored in Cloudflare D1 (SQLite).

## Development Commands

### Local Development
```bash
npm install                    # Install dependencies
npm run dev                    # Start Next.js dev server (localhost:3000)
npm run wrangler:dev          # Start with Cloudflare Workers emulation (for D1 binding)
```

### Database Operations
```bash
npm run db:create              # Create D1 database (one-time setup)
npm run db:migrate:local       # Run migrations on local D1
npm run db:migrate:prod        # Run migrations on production D1
```

### Build and Deploy
```bash
npm run build                  # Build Next.js app with OpenNext for Cloudflare
npm run deploy                 # Build and deploy to Cloudflare Workers
npm run lint                   # Run ESLint
```

### Secret Management
```bash
# Local development: create .dev.vars file
echo "GEMINI_API_KEY=your-key" > .dev.vars

# Production: set Cloudflare secret (only needed for manual deployment)
wrangler secret put GEMINI_API_KEY
```

## Architecture

### Deployment Model: Next.js on Cloudflare Workers

This project uses **OpenNext** (@opennextjs/cloudflare) to adapt Next.js for Cloudflare Workers, which requires understanding the deployment architecture:

1. **Build Process**: `npm run build` invokes OpenNext to transform Next.js into a Cloudflare Worker-compatible format
2. **Worker Entry**: `wrangler.toml` points to `.open-next/worker.js` as the main entry point
3. **Static Assets**: Served from `.open-next/assets` directory via Cloudflare's asset binding
4. **Edge Runtime**: All API routes run on Cloudflare's edge network

### Cloudflare Integration Points

**D1 Database Binding**:
- Configured in `wrangler.toml` as `binding = "DB"`
- Accessed in API routes via `getCloudflareContext()` from `@opennextjs/cloudflare`
- TypeScript interface defined in `env.d.ts` as `CloudflareEnv`

**Environment Variables**:
- `GEMINI_API_KEY`: Secret managed via Wrangler CLI or GitHub Actions
- `NODE_ENV`: Set to "production" in `wrangler.toml`

**OpenNext Configuration** (`open-next.config.ts`):
- Uses `cloudflare-node` wrapper for API routes
- Uses `cloudflare-edge` wrapper for middleware
- Dummy cache implementations (no ISR support)
- External dependency: `node:crypto` for encryption

### API Routes Architecture

**Translation API** (`/api/translate`):
- Uses Gemini 2.5 Flash Lite for translation
- Implements specialized prompt engineering for LLM instruction optimization
- Temperature set to 0.1 for consistency
- Returns plain English text without explanations

**History API** (`/api/history`):
- RESTful design: GET (paginated list), POST (save), DELETE (remove)
- Pagination: 20 items per page with offset-based loading
- Stores both original translation and user edits
- Tracks `is_edited` flag for analytics

### Database Schema

**translations table** (see `migrations/0001_create_translations.sql`):
- Primary fields: `korean_text`, `english_text`, `edited_english_text`
- Metadata: `is_edited`, `created_at`, `updated_at`
- Future columns: `llm_used`, `tags`, `is_favorite`, `notes` (not yet implemented)
- Indexed on `created_at DESC` for efficient pagination

### Frontend Data Flow

**State Management**:
- Uses TanStack Query (React Query) for server state
- Provider configured in `app/providers.tsx`
- Infinite query pattern in `app/hooks/useHistory.ts` for pagination

**Key UI Patterns**:
- Main page (`app/page.tsx`): Translation form with editable results
- History page (`app/history/page.tsx`): Infinite scroll list with CSV export
- No client-side routing beyond Next.js App Router conventions

## CI/CD

GitHub Actions automatically deploys on push to `main` (see `.github/workflows/deploy.yml`):
1. Installs dependencies
2. Builds Next.js with OpenNext
3. Runs D1 migrations
4. Syncs `GEMINI_API_KEY` secret to Workers
5. Deploys to Cloudflare Workers

**Required GitHub Secrets**:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `GEMINI_API_KEY`

## Important Constraints

### Cloudflare Workers Limitations
- **No Node.js APIs**: Use edge-compatible alternatives (e.g., Web Crypto API instead of `node:crypto` in client code)
- **No ISR/SSG**: Incremental Static Regeneration not supported; use dummy cache in OpenNext config
- **D1 Only in Production**: Local development requires `wrangler dev` for D1 binding (standard Next.js dev server won't have DB access)

### TypeScript Configuration
- Environment types in `env.d.ts` must match Cloudflare bindings
- Cast `env as CloudflareEnv` when accessing D1 in API routes
- Cloudflare Workers types from `@cloudflare/workers-types`

## Translation Prompt Engineering

The translation prompt in `/api/translate/route.ts` is optimized for:
1. **Model Neutrality**: Works across Claude, GPT, and Gemini
2. **Imperative Language**: Action-oriented verbs for better LLM adherence
3. **Token Efficiency**: Concise instructions to reduce API costs
4. **Context Preservation**: Maintains technical nuances in software/logic prompts

When modifying the prompt, maintain these principles to ensure output quality.
