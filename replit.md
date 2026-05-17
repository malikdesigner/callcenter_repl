# MediFlow — AI Healthcare Platform

A fully functional multi-tenant AI healthcare appointment SaaS platform. Hospitals and clinics can manage doctors, patients, and appointments, get real-time dashboard analytics, and interact with a context-aware AI scheduling assistant.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + shadcn/ui + Wouter routing
- API: Express 5 + Zod validation
- DB: PostgreSQL + Drizzle ORM
- Auth: bcryptjs + jsonwebtoken (JWT, 7-day expiry)
- State: Zustand (auth store)
- Data fetching: TanStack Query + Orval-generated hooks
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI 3.1 spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — generated TanStack Query hooks + Zod schemas
- `lib/db/src/schema/` — Drizzle ORM schema files (tenants, users, doctors, patients, appointments)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, tenants, doctors, patients, appointments, dashboard, ai)
- `artifacts/healthcare/src/pages/` — React page components (login, dashboard, appointments, doctors, patients, ai-assistant, voice-call, tenants)
- `artifacts/healthcare/src/hooks/use-auth.ts` — Zustand auth store with localStorage persistence
- `artifacts/healthcare/src/components/layout.tsx` — sidebar nav layout
- `artifacts/api-server/src/routes/voice.ts` — WebSocket voice handler (STT→LLM→TTS pipeline)
- `artifacts/voice-agent/scripts/transcribe.py` — faster-whisper Urdu speech-to-text
- `artifacts/voice-agent/scripts/tts.py` — edge-tts Urdu text-to-speech
- `artifacts/voice-agent/README.md` — local setup guide for voice agent

## Architecture decisions

- **Contract-first API**: OpenAPI spec is the source of truth; Orval generates both React hooks (client) and Zod schemas (server validation) from it. Never write API types manually.
- **JWT stored in localStorage**: Auth token stored as `mediflow_token`, user object as `mediflow_user`. `setAuthTokenGetter` wires it into every API call automatically via `main.tsx`.
- **Text columns for dates**: Appointment dates stored as `text` (YYYY-MM-DD string) rather than `date` type to avoid timezone issues. Orval generates `Date` objects from OpenAPI `format: date` — convert with `.toISOString().split("T")[0]` in route handlers.
- **Proxy-based routing**: All traffic goes through the shared Replit proxy. API server handles `/api/*`, frontend handles `/`. No CORS proxy needed in Vite.
- **Context-aware AI assistant**: No external LLM. The AI chat route (`/api/ai/chat`) uses rule-based pattern matching against live DB data to answer scheduling questions.
- **Voice agent embedded in Express**: WebSocket endpoint at `/api/voice/ws` handles the full STT→LLM→TTS pipeline. Node.js manages the WebSocket; Python subprocesses (faster-whisper, edge-tts) handle audio. Ollama is called directly from Node.js via fetch. No separate service port needed.
- **Push-to-talk protocol**: Client sends audio as raw binary chunks, then `{"type":"end_recording"}` JSON. Server responds with `transcript`, `response_text`, binary MP3 audio, then `done`.

## Product

- **Multi-tenant**: One platform, multiple hospitals/clinics (tenants)
- **Dashboard**: Real-time stats (total/scheduled/completed/cancelled appointments, doctors, patients, today's appointments) + activity feed
- **Appointments**: Book, view, filter by status/date, mark complete, cancel
- **Doctors**: Register with specialty, availability schedule, slot duration; view/delete
- **Patients**: Register with demographics and blood type; search by name
- **AI Assistant**: Chat interface for natural language scheduling queries
- **Voice Call**: Push-to-talk Urdu voice agent — speaks with the hospital AI about doctors, appointments, hours, and emergency contacts. Uses faster-whisper (STT) + Ollama (LLM) + edge-tts (TTS). Rule-based fallback when Ollama is offline.
- **Tenants** (admin only): Create and manage hospital/clinic organizations

## Default credentials

- Email: `admin@generalhospital.com`
- Password: `admin123`
- Role: admin (has access to Tenants management)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm run typecheck:libs` before typechecking `api-server` — it needs the built DB schema declarations.
- Orval generates `Date` type for OpenAPI `format: date` fields. Convert in route handlers with `.toISOString().split("T")[0]` before passing to Drizzle.
- `bcryptjs` (pure JS) is used instead of `bcrypt` (native) to avoid build script issues.
- The `doctors` table has no unique constraint on `license_number` — avoid `ON CONFLICT` without specifying a unique column.
- Activity log is synthesized from the appointments table in `dashboard.ts` — there is no separate `activity_log` table.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
