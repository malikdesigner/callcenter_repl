# MediFlow — AI Healthcare Platform

A fully functional, **local-first multi-tenant AI healthcare appointment SaaS platform**. Hospitals and clinics can manage doctors, patients, and appointments, get real-time dashboard analytics, and interact with a context-aware AI scheduling assistant — including an **Urdu voice agent**.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Default Credentials](#default-credentials)
- [Troubleshooting](#troubleshooting)

---

## Features

- **Multi-tenant** — one platform, multiple hospitals/clinics
- **Dashboard** — real-time stats (appointments, doctors, patients, activity feed)
- **Appointments** — book, filter by status/date, mark complete, cancel
- **Doctors** — register with specialty, availability schedule, and slot duration
- **Patients** — register with demographics and blood type; search by name
- **AI Assistant** — chat interface for natural language scheduling queries
- **Urdu Voice Agent** — push-to-talk voice assistant using STT → LLM → TTS pipeline
- **Tenants** (admin only) — create and manage hospital/clinic organizations

---

## Tech Stack

### Frontend (`artifacts/healthcare`)

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Vite | latest | Build tool & dev server |
| Tailwind CSS | v4 | Utility-first styling |
| shadcn/ui + Radix UI | latest | Accessible UI components |
| Framer Motion | latest | Animations |
| Wouter | ^3.3.5 | Lightweight routing |
| Zustand | ^5.0.13 | Global auth state management |
| TanStack Query | latest | Server state & data fetching |
| React Hook Form | ^7.55.0 | Form management |
| Zod | latest | Schema validation |
| Recharts | ^2.15.2 | Data visualization/charts |
| Lucide React | latest | Icon set |

### Backend — API Server (`artifacts/api-server`)

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 24 | Runtime |
| TypeScript | ~5.9.3 | Type safety |
| Express | ^5.2.1 | HTTP server framework |
| express-ws | ^5.0.2 | WebSocket support |
| Drizzle ORM | latest | Database ORM |
| PostgreSQL (node-postgres) | latest | Primary database |
| bcryptjs | ^3.0.3 | Password hashing |
| jsonwebtoken | ^9.0.3 | JWT authentication |
| Zod | latest | Request validation |
| Pino | ^9.14.0 | Structured logging |
| esbuild | 0.27.3 | Fast bundler (CJS output) |

### Voice Agent (`artifacts/voice-agent`)

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | >=0.115.0 | HTTP/WebSocket server |
| Uvicorn | >=0.32.0 | ASGI server |
| faster-whisper | >=1.1.0 | Urdu speech-to-text (STT) |
| edge-tts | >=6.1.0 | Urdu text-to-speech (TTS) |
| httpx | >=0.28.0 | Async HTTP client |
| pydub | >=0.25.1 | Audio processing |
| websockets | >=13.0 | WebSocket communication |
| aiofiles | >=24.1.0 | Async file I/O |
| FFmpeg | system | Audio transcoding (WebM → WAV → MP3) |
| Ollama | external | Local LLM inference (phi3 / aya) |

### Shared Libraries (`lib/`)

| Package | Purpose |
|---|---|
| `@workspace/db` | Drizzle ORM schema + PostgreSQL client |
| `@workspace/api-spec` | OpenAPI 3.1 spec (source of truth) |
| `@workspace/api-zod` | Auto-generated Zod schemas from OpenAPI spec |
| `@workspace/api-client-react` | Auto-generated TanStack Query hooks |

### Tooling & Infrastructure

| Tool | Purpose |
|---|---|
| pnpm workspaces | Monorepo package management |
| TypeScript | End-to-end type safety |
| Orval | OpenAPI → TypeScript/Zod code generation |
| Prettier | Code formatting |

---

## Project Structure

```
mediflow/
├── artifacts/
│   ├── healthcare/          # React + Vite frontend
│   │   └── src/
│   │       ├── pages/       # Login, Dashboard, Appointments, Doctors, Patients, AI, Voice
│   │       ├── components/  # Layout, UI components
│   │       └── hooks/       # Auth store (Zustand)
│   ├── api-server/          # Express 5 backend (Node.js)
│   │   └── src/
│   │       └── routes/      # auth, doctors, patients, appointments, dashboard, ai, voice
│   └── voice-agent/         # FastAPI Python voice service
│       └── scripts/         # transcribe.py (Whisper), tts.py (edge-tts)
├── lib/
│   ├── api-spec/            # openapi.yaml — API contract source of truth
│   ├── api-zod/             # Generated Zod schemas
│   ├── api-client-react/    # Generated TanStack Query hooks
│   └── db/                  # Drizzle schema (tenants, users, doctors, patients, appointments)
├── scripts/                 # Workspace utility scripts
├── package.json             # Root workspace config
├── pnpm-workspace.yaml      # pnpm workspace + dependency catalog
└── tsconfig.base.json       # Shared TypeScript config
```

---

## Prerequisites

Make sure you have the following installed before starting:

| Requirement | Version | Download |
|---|---|---|
| Node.js | 20+ (24 recommended) | https://nodejs.org |
| pnpm | 9+ | `npm install -g pnpm` |
| Python | 3.11+ | https://www.python.org |
| PostgreSQL | 14+ | https://www.postgresql.org |
| FFmpeg | latest | See below |
| Ollama | latest | https://ollama.ai/download |

### Install FFmpeg

**macOS (Homebrew):**
```bash
brew install ffmpeg
```

**Ubuntu / WSL2:**
```bash
sudo apt update && sudo apt install -y ffmpeg
```

**Windows (Chocolatey):**
```bash
choco install ffmpeg
```

### Install Ollama & pull a model

```bash
# Download from https://ollama.ai/download, then pull a model:

# Recommended (small, fast):
ollama pull phi3

# Better Urdu support (larger, ~4GB):
ollama pull aya

# Fastest (~1.3GB):
ollama pull phi3:mini
```

---

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd mediflow
```

### 2. Install Node.js dependencies

```bash
pnpm install
```

### 3. Set up the database

Create a PostgreSQL database:

```bash
psql -U postgres -c "CREATE DATABASE mediflow;"
```

### 4. Configure environment variables

Create a `.env` file in `artifacts/api-server/`:

```bash
cp artifacts/api-server/.env.example artifacts/api-server/.env
```

Then fill in the values (see [Environment Variables](#environment-variables) below).

### 5. Push the database schema

```bash
pnpm --filter @workspace/db run push
```

### 6. Install Python dependencies (for Voice Agent)

```bash
cd artifacts/voice-agent
pip install -r requirements.txt
cd ../..
```

### 7. Generate API client code (optional, already committed)

```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## Environment Variables

### API Server (`artifacts/api-server/.env`)

| Variable | Required | Example | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://postgres:password@localhost:5432/mediflow` | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | `your-super-secret-key-here` | JWT signing secret (use a long random string) |
| `PORT` | No | `8080` | Server port (default: `5000`) |
| `NODE_ENV` | No | `development` | Node environment |

### Voice Agent (environment variables or shell export)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8001` | Voice agent server port |
| `BASE_PATH` | `/voice` | URL prefix |
| `OLLAMA_URL` | `http://localhost:11434/api/generate` | Ollama API endpoint |
| `OLLAMA_MODEL` | `phi3` | LLM model name |
| `WHISPER_MODEL` | `base` | Whisper model size (`tiny` / `base` / `small`) |
| `TTS_VOICE` | `ur-PK-UzmaNeural` | Urdu TTS voice |

---

## Running the Project

Open **4 terminal windows** and run each service:

**Terminal 1 — Ollama (LLM):**
```bash
ollama serve
```

**Terminal 2 — API Server:**
```bash
cd artifacts/api-server
PORT=8080 SESSION_SECRET=your-secret-key pnpm run dev
```

**Terminal 3 — Voice Agent:**
```bash
cd artifacts/voice-agent
PORT=8001 BASE_PATH=/voice OLLAMA_MODEL=phi3 python main.py
```

**Terminal 4 — Frontend:**
```bash
cd artifacts/healthcare
PORT=3000 pnpm run dev
```

Then open your browser at: **http://localhost:3000**

---

## Useful Commands

```bash
# Typecheck all packages
pnpm run typecheck

# Build all packages
pnpm run build

# Regenerate API hooks and Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push

# Typecheck only shared libraries
pnpm run typecheck:libs
```

---

## Default Credentials

| Field | Value |
|---|---|
| Email | `admin@generalhospital.com` |
| Password | `admin123` |
| Role | `admin` (access to Tenants management) |

---

## Whisper Model Options (Speech-to-Text)

| Model | Size | Speed | Urdu Accuracy |
|---|---|---|---|
| `tiny` | ~75 MB | Fastest | Good |
| `base` | ~150 MB | Fast | Better |
| `small` | ~500 MB | Moderate | Best for CPU |

The model is downloaded automatically on first run.

---

## Urdu TTS Voices

| Voice | Gender |
|---|---|
| `ur-PK-UzmaNeural` | Female (default) |
| `ur-PK-AsadNeural` | Male |

Change with: `TTS_VOICE=ur-PK-AsadNeural python main.py`

---

## Troubleshooting

**`ffmpeg not found`**
Install FFmpeg and make sure it is added to your system PATH.

**`Ollama unavailable`**
Start Ollama with `ollama serve`. The voice agent has rule-based fallback responses when Ollama is offline.

**`No microphone access`**
Allow microphone permissions in your browser when prompted.

**Poor Urdu transcription**
Use `WHISPER_MODEL=small` for better accuracy at the cost of speed.

**Slow responses**
Use `WHISPER_MODEL=tiny` and `OLLAMA_MODEL=phi3:mini` for the fastest pipeline.

**`pnpm: command not found`**
Install pnpm globally: `npm install -g pnpm`

**Database connection errors**
Ensure PostgreSQL is running and your `DATABASE_URL` is correct. Check with: `psql $DATABASE_URL`

**TypeScript errors after pulling changes**
Run `pnpm run typecheck:libs` first — the API server depends on built library declarations.
