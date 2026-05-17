import os
import io
import asyncio
import tempfile
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi3")
URDU_VOICE = os.getenv("TTS_VOICE", "ur-PK-UzmaNeural")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")

_whisper_model = None


def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        logger.info(f"Loading Whisper model: {WHISPER_MODEL}")
        _whisper_model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
        logger.info("Whisper model loaded")
    return _whisper_model


async def transcribe_audio(audio_bytes: bytes) -> str:
    """Convert audio bytes to Urdu text using faster-whisper."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_transcribe, audio_bytes)


def _sync_transcribe(audio_bytes: bytes) -> str:
    import subprocess

    tmp_input = None
    tmp_wav = None
    try:
        # Write raw audio to temp file
        suffix = ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            f.write(audio_bytes)
            tmp_input = f.name

        tmp_wav = tmp_input.replace(suffix, ".wav")

        # Convert to WAV using ffmpeg
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_input, "-ar", "16000", "-ac", "1", "-f", "wav", tmp_wav],
            capture_output=True,
            timeout=30,
        )
        if result.returncode != 0:
            logger.warning(f"ffmpeg error: {result.stderr.decode()}")
            return ""

        model = get_whisper_model()
        segments, _ = model.transcribe(
            tmp_wav,
            language="ur",
            beam_size=3,
            vad_filter=True,
        )
        text = " ".join(s.text for s in segments).strip()
        logger.info(f"Transcribed: {text}")
        return text

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return ""
    finally:
        for p in [tmp_input, tmp_wav]:
            if p and Path(p).exists():
                try:
                    Path(p).unlink()
                except Exception:
                    pass


async def get_llm_response(user_message: str, history: list[dict]) -> str:
    """Get AI response from Ollama (with rule-based fallback)."""
    from hospital_info import SYSTEM_PROMPT

    history_text = ""
    for h in history[-6:]:
        history_text += f"انسان: {h['user']}\nاسسٹنٹ: {h['assistant']}\n\n"

    prompt = f"{SYSTEM_PROMPT}\n\n{history_text}انسان: {user_message}\nاسسٹنٹ:"

    try:
        import httpx
        async with httpx.AsyncClient(timeout=40.0) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.7, "num_predict": 200},
                },
            )
            if response.status_code == 200:
                text = response.json().get("response", "").strip()
                if text:
                    logger.info(f"LLM response: {text[:80]}...")
                    return text
    except Exception as e:
        logger.warning(f"Ollama unavailable: {e}")

    # Rule-based fallback
    return _fallback_response(user_message)


def _fallback_response(message: str) -> str:
    """Simple rule-based Urdu responses when Ollama is unavailable."""
    from hospital_info import HOSPITAL_CONTEXT
    msg = message.lower()

    if any(w in msg for w in ["اپائنٹمنٹ", "appointment", "ملنا", "ڈاکٹر سے"]):
        return "اپائنٹمنٹ کے لیے آپ ہمارے نمبر +1 (555) 100-0000 پر کال کریں یا www.mediflow.com پر آن لائن بک کریں۔"
    elif any(w in msg for w in ["وقت", "اوقات", "time", "hours", "کھلا", "بند"]):
        return "ہسپتال پیر سے جمعہ صبح 8 بجے سے شام 6 بجے تک کھلا ہے۔ ہفتہ کو 9 بجے سے 2 بجے تک۔ ایمرجنسی 24 گھنٹے دستیاب ہے۔"
    elif any(w in msg for w in ["ڈاکٹر", "doctor", "specialist", "خصوصی"]):
        return "ہمارے پاس 5 ماہر ڈاکٹر ہیں: کارڈیالوجی، نیورالوجی، بچوں کی بیماریاں، آرتھوپیڈکس، اور اندرونی طب۔ کس ڈاکٹر سے ملنا چاہتے ہیں؟"
    elif any(w in msg for w in ["ایمرجنسی", "emergency", "فوری"]):
        return "ایمرجنسی کے لیے فوری 911 پر کال کریں یا ہمارا ایمرجنسی نمبر +1 (555) 100-0911 ڈائل کریں۔ ایمرجنسی وارڈ 24 گھنٹے کھلا ہے۔"
    elif any(w in msg for w in ["دل", "heart", "سینہ", "کارڈیو"]):
        return "دل کی بیماریوں کے لیے ڈاکٹر سارہ چن دستیاب ہیں۔ اپائنٹمنٹ کے لیے +1 (555) 201-0001 پر رابطہ کریں۔"
    elif any(w in msg for w in ["بچہ", "بچے", "children", "kids", "pediatric"]):
        return "بچوں کی بیماریوں کے لیے ڈاکٹر ایملی روڈریگز دستیاب ہیں۔ اوقات: پیر تا جمعہ، صبح 9 سے شام 6 بجے۔"
    elif any(w in msg for w in ["ہڈی", "جوڑ", "گھٹنا", "ortho", "knee"]):
        return "ہڈیوں اور جوڑوں کے لیے ڈاکٹر جیمز پارک ماہر ہیں۔ اپائنٹمنٹ: +1 (555) 201-0004"
    elif any(w in msg for w in ["ذیابیطس", "شوگر", "بلڈ پریشر", "diabetes"]):
        return "ذیابیطس اور بلڈ پریشر کے لیے ڈاکٹر عائشہ پٹیل سے ملیں۔ فون: +1 (555) 201-0005"
    elif any(w in msg for w in ["فیس", "payment", "پیسہ", "قیمت", "charge"]):
        return "ہم تمام بڑی انشورنس کمپنیاں قبول کرتے ہیں۔ کیش اور کریڈٹ کارڈ بھی قبول ہے۔ تفصیل کے لیے رسیپشن سے رابطہ کریں۔"
    elif any(w in msg for w in ["ہیلو", "hello", "السلام", "assalam", "سلام"]):
        return "السلام علیکم! میں جنرل ہسپتال کا AI اسسٹنٹ ہوں۔ میں آپ کی کیسے مدد کر سکتا ہوں؟"
    else:
        return "جنرل ہسپتال میں خوش آمدید۔ اپائنٹمنٹ، ڈاکٹرز، یا ہسپتال کی معلومات کے لیے میں حاضر ہوں۔ آپ کیا جاننا چاہتے ہیں؟"


async def text_to_speech(text: str) -> bytes:
    """Convert text to Urdu speech using edge-tts."""
    try:
        import edge_tts
        communicate = edge_tts.Communicate(text, URDU_VOICE)
        audio_buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_buf.write(chunk["data"])
        audio_bytes = audio_buf.getvalue()
        if audio_bytes:
            logger.info(f"TTS generated {len(audio_bytes)} bytes")
            return audio_bytes
    except Exception as e:
        logger.error(f"TTS error: {e}")

    # Fallback: empty mp3 (silence)
    return b""
