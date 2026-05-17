#!/usr/bin/env python3
"""
Convert Urdu text to speech using edge-tts.
Usage: python tts.py "<text>" [voice]
Output: MP3 audio bytes on stdout
"""
import sys
import asyncio
import io
import os


async def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(1)

    text = sys.argv[1]
    voice = sys.argv[2] if len(sys.argv) > 2 else os.getenv("TTS_VOICE", "ur-PK-UzmaNeural")

    try:
        import edge_tts  # type: ignore
        communicate = edge_tts.Communicate(text, voice)
        buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])
        audio = buf.getvalue()
        if audio:
            sys.stdout.buffer.write(audio)
            sys.stdout.buffer.flush()
    except Exception as e:
        print(str(e), file=sys.stderr, flush=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
