import sys
from faster_whisper import WhisperModel

AUDIO = r"C:\Users\user\Downloads\Prestige\prestige_audio.wav"
OUT_TS = r"C:\Users\user\Downloads\Prestige\transcript_timestamped.txt"
OUT_TXT = r"C:\Users\user\Downloads\Prestige\transcript.txt"

print("Loading model (base, int8 CPU)...", flush=True)
model = WhisperModel("base", device="cpu", compute_type="int8")

print("Transcribing...", flush=True)
segments, info = model.transcribe(AUDIO, vad_filter=True, beam_size=5)
print(f"Detected language: {info.language} (p={info.language_probability:.2f})", flush=True)

def hhmmss(s):
    h = int(s // 3600); m = int((s % 3600) // 60); sec = int(s % 60)
    return f"{h:02d}:{m:02d}:{sec:02d}"

plain = []
with open(OUT_TS, "w", encoding="utf-8") as fts:
    for seg in segments:
        line = f"[{hhmmss(seg.start)} -> {hhmmss(seg.end)}] {seg.text.strip()}"
        print(line, flush=True)
        fts.write(line + "\n")
        plain.append(seg.text.strip())

with open(OUT_TXT, "w", encoding="utf-8") as ftxt:
    ftxt.write(" ".join(plain))

print("\nDONE. Wrote transcript.txt and transcript_timestamped.txt", flush=True)
