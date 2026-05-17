#!/usr/bin/env python3
"""
Transcribe audio file to Urdu text using faster-whisper.
Usage: python transcribe.py <audio_file_path>
Output: UTF-8 text on stdout
"""
import sys
import os

def main():
    if len(sys.argv) < 2:
        print("", flush=True)
        sys.exit(0)

    audio_file = sys.argv[1]
    model_size = os.getenv("WHISPER_MODEL", "base")

    if not os.path.exists(audio_file):
        print("", flush=True)
        sys.exit(0)

    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        segments, info = model.transcribe(
            audio_file,
            language="ur",
            beam_size=3,
            vad_filter=True,
        )
        text = " ".join(s.text for s in segments).strip()
        print(text, flush=True)
    except Exception as e:
        print("", file=sys.stderr, flush=True)
        print(str(e), file=sys.stderr, flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
