# MediFlow Voice Agent — Local Setup Guide

AI-powered Urdu voice assistant for General Hospital.

## Requirements

- Python 3.11+
- FFmpeg
- Ollama (for LLM)
- Internet connection (for edge-tts)

---

## Installation (Windows/WSL2)

### 1. Install FFmpeg

**Windows (Chocolatey):**
```bash
choco install ffmpeg
```

**WSL2 (Ubuntu):**
```bash
sudo apt update && sudo apt install -y ffmpeg
```

### 2. Install Python packages
```bash
cd artifacts/voice-agent
pip install -r requirements.txt
```

### 3. Install Ollama
Download from: https://ollama.ai/download

Then pull a multilingual model:
```bash
# Small model (good for most systems):
ollama pull phi3

# Better Urdu support (larger, 4GB):
ollama pull aya

# Fastest (1.3GB):
ollama pull phi3:mini
```

### 4. Start Ollama
```bash
ollama serve
```

---

## Running the Voice Agent

```bash
cd artifacts/voice-agent
PORT=8001 BASE_PATH=/voice OLLAMA_MODEL=phi3 python main.py
```

Environment variables:
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8001` | Server port |
| `BASE_PATH` | `/voice` | URL prefix |
| `OLLAMA_URL` | `http://localhost:11434/api/generate` | Ollama endpoint |
| `OLLAMA_MODEL` | `phi3` | Ollama model name |
| `WHISPER_MODEL` | `base` | Whisper model size (`tiny`/`base`/`small`) |
| `TTS_VOICE` | `ur-PK-UzmaNeural` | Urdu TTS voice |

---

## Whisper Models (Speech-to-Text)

| Model | Size | Speed | Urdu Accuracy |
|-------|------|-------|---------------|
| tiny | ~75MB | Fastest | Good |
| base | ~150MB | Fast | Better |
| small | ~500MB | Moderate | Best for CPU |

First run downloads the model automatically.

---

## TTS Voices (Urdu)

- `ur-PK-UzmaNeural` — Female (default)
- `ur-PK-AsadNeural` — Male

Change with: `TTS_VOICE=ur-PK-AsadNeural python main.py`

---

## Full Stack Local Setup

Start all three services:

```bash
# Terminal 1: Ollama
ollama serve

# Terminal 2: API Server
cd artifacts/api-server
PORT=8080 SESSION_SECRET=your-secret pnpm run dev

# Terminal 3: Voice Agent
cd artifacts/voice-agent
PORT=8001 BASE_PATH=/voice python main.py

# Terminal 4: Frontend
cd artifacts/healthcare
PORT=3000 pnpm run dev
```

Then open: http://localhost:3000

---

## Troubleshooting

**"ffmpeg not found"** — Install FFmpeg and ensure it's in PATH

**"Ollama unavailable"** — Start Ollama with `ollama serve`. Voice agent has rule-based fallback responses when Ollama is offline.

**"No microphone access"** — Allow browser microphone permission

**Poor Urdu transcription** — Use `WHISPER_MODEL=small` for better accuracy

**Slow responses** — Use `WHISPER_MODEL=tiny` and `OLLAMA_MODEL=phi3:mini`
