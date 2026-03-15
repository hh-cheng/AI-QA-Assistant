# AGENTS.md

## Project Summary

- Monorepo managed with `pnpm` workspaces and `turbo`.
- Frontend: `apps/web` uses Next.js 16 App Router, React 19, Tailwind CSS v4, shared shadcn/ui primitives from `packages/ui`.
- Backend: `apps/server` uses Hono and exposes Better Auth endpoints plus a tRPC API.
- Shared packages:
  - `packages/api`: tRPC router, context, QA domain types, and current mock QA state.
  - `packages/auth`: Better Auth server configuration backed by Drizzle.
  - `packages/db`: Drizzle schema and database scripts for PostgreSQL.
  - `packages/env`: validated env access for server and web.
  - `packages/ui`: shared UI primitives and global design tokens.
  - `packages/config`: shared TypeScript base config.

## Repository Map

- `apps/web`
  - Next.js app on port `3001`.
  - Uses `@/` alias for `src/*`.
  - Talks to the backend with `better-auth/react` and `@trpc/client`.
- `apps/server`
  - Hono server on port `3000`.
  - Mounts Better Auth at `/api/auth/*`.
  - Mounts tRPC at `/trpc/*`.
- `packages/api`
  - `src/context.ts` derives auth session from Better Auth request headers.
  - `src/routers/qa.ts` currently stores QA documents, conversations, provider settings, and defaults in module-level in-memory arrays and counters.
- `packages/auth`
  - Better Auth uses the Drizzle adapter against PostgreSQL.
  - Cookie config is cross-origin oriented: `sameSite: "none"`, `secure: true`, `httpOnly: true`.
- `packages/db`
  - Auth tables live in `src/schema/auth.ts`.
  - Docker Compose exists only for PostgreSQL in `docker-compose.yml`.
- `packages/env`
  - Server env is validated in `src/server.ts`.
  - Browser env is validated in `src/web.ts`.

## Commands

- Install deps: `pnpm install`
- Start all dev processes: `pnpm dev`
- Start frontend only: `pnpm dev:web`
- Start backend only: `pnpm dev:server`
- Build all packages/apps: `pnpm build`
- Typecheck all packages/apps: `pnpm check-types`
- Format and lint with autofix: `pnpm check`
- Start database container: `pnpm db:start`
- Stop database container: `pnpm db:down`
- Push Drizzle schema: `pnpm db:push`
- Generate Drizzle artifacts: `pnpm db:generate`
- Run migrations: `pnpm db:migrate`
- Open Drizzle Studio: `pnpm db:studio`

## Required Environment

Server-side validated env:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CORS_ORIGIN`
- `NODE_ENV`

Web-side validated env:

- `NEXT_PUBLIC_SERVER_URL`

Expected local defaults implied by code:

- Web runs on `http://localhost:3001`
- Server runs on `http://localhost:3000`
- `NEXT_PUBLIC_SERVER_URL` should usually point to `http://localhost:3000`
- `CORS_ORIGIN` should usually point to `http://localhost:3001`
- `BETTER_AUTH_URL` should match the backend origin, usually `http://localhost:3000`

Note: Better Auth cookies are configured as `secure: true` with `sameSite: "none"`. If local auth fails over plain HTTP, inspect this first before changing unrelated code.

## Coding Conventions

- Use TypeScript everywhere. The repo is strict and shared config enables `noUncheckedIndexedAccess`, `noUnusedLocals`, and `noUnusedParameters`.
- Use Biome as the formatter/linter baseline. Do not introduce Prettier/ESLint-only fixes unless explicitly required.
- Keep imports and code style compatible with existing Biome formatting:
  - 2-space indentation
  - double quotes
  - semicolon-free style
- Prefer `shadcn/ui` patterns and primitives for UI work. Reuse or extend the existing shadcn-based components before introducing another component library.
- Prefer existing path aliases:
  - Web: `@/*`
  - Shared UI: `@Intelligent-QA-Assistant/ui/*`
- Do not add ad hoc UI primitives inside `apps/web` if a reusable primitive belongs in `packages/ui`.
- `apps/web` has `typedRoutes: true` and `reactCompiler: true`; preserve compatibility with typed routing and modern React patterns.

## Architecture Notes

### Auth flow

- Browser auth client: `apps/web/src/lib/auth-client.ts`
- Server auth config: `packages/auth/src/index.ts`
- Hono handler mount: `apps/server/src/index.ts`
- tRPC auth enforcement:
  - public procedures use `publicProcedure`
  - authenticated procedures use `protectedProcedure`

When changing auth behavior, verify all of:

- Better Auth server config
- Hono auth route mounting
- `CORS_ORIGIN` / `BETTER_AUTH_URL` / `NEXT_PUBLIC_SERVER_URL`
- frontend session reads in `apps/web/src/lib/qa-auth.ts`

### API and data flow

- tRPC router root: `packages/api/src/routers/index.ts`
- QA router: `packages/api/src/routers/qa.ts`
- tRPC client setup: `apps/web/src/utils/trpc.ts`

Important: the QA experience is not fully backed by the database yet. `packages/api/src/routers/qa.ts` uses in-memory arrays and counters as its current source of truth. If a user asks for persistent QA data, you need to design and implement storage instead of assuming Drizzle tables already exist.

### Database

- The existing Drizzle schema mainly covers Better Auth tables.
- There is no QA-specific persistence schema in `packages/db/src/schema` yet.
- Use `packages/db/src/schema/index.ts` as the export surface when adding new tables.

## Change Guidelines

- For UI changes:
  - Prefer shadcn-based components and conventions first.
  - Inspect `packages/ui` first before creating new controls.
  - Keep styling aligned with the existing Tailwind v4 and shadcn setup.
  - For protected route pages in `apps/web/src/app`, prefer route-local organization that mirrors `app/(protected)/chat`:
    - keep `page.tsx` thin and limited to server concerns such as auth/session checks
    - place the main client page component under the route's own `components/` directory
    - extract a colocated `service.ts` when the page has meaningful client state, side effects, or request orchestration
    - extract colocated `types.ts` and `utils.ts` only when they reduce complexity; do not force extra files for simple pages around 100 lines or less
  - Avoid placing route-specific page implementations in shared folders like `apps/web/src/components/qa`; reserve shared folders for genuinely reusable primitives.
- For backend/API changes:
  - Prefer placing shared business logic in `packages/api` rather than `apps/server`.
  - Keep `apps/server` focused on wiring, transport, and middleware.
- For env changes:
  - Update the relevant validator in `packages/env`.
  - Reflect new requirements in README or other setup docs if they affect local bootstrapping.
- For database changes:
  - Update Drizzle schema first.
  - Then use the provided `db:*` scripts instead of ad hoc commands.

## Validation Checklist

Before finishing substantial changes, prefer this order:

1. `pnpm check`
2. `pnpm check-types`
3. Run the smallest relevant app command if runtime behavior changed:
   - `pnpm dev:web`
   - `pnpm dev:server`
   - or `pnpm dev`

If you modify auth, routing, or request flow, verify both the browser-facing web app and the Hono server behavior, not just typechecks.

## Known Project-Specific Risks

- QA data is mock/in-memory, so server restarts reset it.
- Better Auth cookie settings are production-leaning and can cause local-session confusion.
- The repo currently has no dedicated automated test suite configured in root scripts; validation relies mainly on Biome, TypeScript, and targeted runtime verification.
