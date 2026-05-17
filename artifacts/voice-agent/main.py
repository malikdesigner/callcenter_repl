import os
import json
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_PATH = os.getenv("BASE_PATH", "/voice")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Voice agent starting — pre-loading Whisper model...")
    try:
        from agent import get_whisper_model
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, get_whisper_model)
        logger.info("Whisper model ready")
    except Exception as e:
        logger.warning(f"Whisper pre-load failed (will load on first request): {e}")
    yield
    logger.info("Voice agent shutting down")


app = FastAPI(title="MediFlow Voice Agent", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(f"{BASE_PATH}/health")
async def health():
    return {"status": "ok", "service": "voice-agent"}


@app.websocket(f"{BASE_PATH}/ws")
async def voice_websocket(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection established")
    conversation_history: list[dict] = []
    audio_chunks: list[bytes] = []

    from agent import transcribe_audio, get_llm_response, text_to_speech

    try:
        while True:
            data = await websocket.receive()

            # Binary audio data chunk
            if "bytes" in data and data["bytes"]:
                audio_chunks.append(data["bytes"])
                logger.debug(f"Received audio chunk: {len(data['bytes'])} bytes")

            # Text control messages
            elif "text" in data and data["text"]:
                try:
                    msg = json.loads(data["text"])
                except json.JSONDecodeError:
                    continue

                msg_type = msg.get("type")

                if msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))

                elif msg_type == "end_recording":
                    if not audio_chunks:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "کوئی آواز نہیں ملی۔ دوبارہ کوشش کریں۔"
                        }))
                        continue

                    audio_data = b"".join(audio_chunks)
                    audio_chunks = []
                    logger.info(f"Processing {len(audio_data)} bytes of audio")

                    # Step 1: Transcribe
                    await websocket.send_text(json.dumps({"type": "status", "message": "سن رہا ہوں..."}))
                    transcript = await transcribe_audio(audio_data)

                    if not transcript:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "آواز واضح نہیں تھی۔ دوبارہ بولیں۔"
                        }))
                        continue

                    await websocket.send_text(json.dumps({"type": "transcript", "text": transcript}))
                    logger.info(f"Transcript: {transcript}")

                    # Step 2: LLM response
                    await websocket.send_text(json.dumps({"type": "status", "message": "سوچ رہا ہوں..."}))
                    response_text = await get_llm_response(transcript, conversation_history)

                    await websocket.send_text(json.dumps({"type": "response_text", "text": response_text}))
                    logger.info(f"Response: {response_text[:80]}")

                    # Update history
                    conversation_history.append({"user": transcript, "assistant": response_text})
                    if len(conversation_history) > 10:
                        conversation_history = conversation_history[-10:]

                    # Step 3: TTS
                    await websocket.send_text(json.dumps({"type": "status", "message": "بول رہا ہوں..."}))
                    audio_response = await text_to_speech(response_text)

                    if audio_response:
                        await websocket.send_bytes(audio_response)

                    await websocket.send_text(json.dumps({"type": "done"}))

                elif msg_type == "clear_history":
                    conversation_history = []
                    await websocket.send_text(json.dumps({"type": "history_cleared"}))

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
