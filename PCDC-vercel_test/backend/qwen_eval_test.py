"""Read-only experiment: re-evaluate a stored attempt with a local Ollama model
and print the result side-by-side with the stored (OpenAI) evaluation.

Does NOT write to the database.
"""

import json
import sys
import time

from openai import OpenAI

from shared.database import SessionLocal
from services.simulation import service as svc

ATTEMPT_ID = int(sys.argv[1]) if len(sys.argv) > 1 else 2
MODEL = sys.argv[2] if len(sys.argv) > 2 else "qwen2.5:7b"

STRICT = (
    "\n\nRespond with ONLY the JSON object described above. No explanation, no "
    "markdown, no code fences — just the raw JSON."
)


def call_ollama(context: dict) -> str:
    client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")
    result = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": svc.EVALUATION_PROMPT + STRICT},
            {"role": "user", "content": json.dumps(context)},
        ],
        temperature=0.2,
        timeout=300,
    )
    return (result.choices[0].message.content or "").strip()


def main() -> None:
    # Fetch everything from the DB first, then close it — the local inference
    # takes minutes and Neon drops idle connections held open that long.
    db = SessionLocal()
    try:
        context = svc.get_attempt_context(db, ATTEMPT_ID)
        stored = svc.get_evaluation(db, ATTEMPT_ID)  # existing OpenAI result
    finally:
        try:
            db.close()
        except Exception:
            pass

    qwen = None
    elapsed = 0.0
    for attempt in range(3):
        start = time.time()
        try:
            raw = call_ollama(context)
            elapsed = time.time() - start
            qwen = svc.normalize_evaluation(svc.parse_json_response(raw))
            break
        except Exception as exc:  # noqa: BLE001 - experiment harness
            print(f"[attempt {attempt + 1}/3] failed: {exc}", flush=True)

    if qwen is None:
        print("qwen produced no parseable evaluation after 3 tries.", flush=True)
        return

    print(f"\nModel: {MODEL}   |   latency: {elapsed:.1f}s   |   attempt #{ATTEMPT_ID}\n")
    keys = [
        "total_score",
        "thinking_depth",
        "logic_score",
        "creativity_score",
        "practicality_score",
        "risk_awareness_score",
        "reflection_score",
        "rapid_fire_score",
        "overall_grade",
    ]
    print(f"{'metric':<22}{'OpenAI (stored)':<18}{MODEL}")
    print("-" * 58)
    for key in keys:
        o = stored.get(key) if stored else "-"
        q = qwen.get(key)
        print(f"{key:<22}{str(o):<18}{q}")

    print("\nPer-question marks (qwen):")
    for qs in qwen.get("question_scores", []):
        if isinstance(qs, dict):
            print(f"  Q{qs.get('question_number')}: {qs.get('marks_awarded')}/{qs.get('marks_total')}")
        else:
            print(f"  (non-object entry: {qs!r})")

    out_path = sys.argv[3] if len(sys.argv) > 3 else "qwen_vs_openai.json"
    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump({"openai": stored, "qwen": qwen}, handle, indent=2, default=str)
    print(f"\nWrote both evaluations to {out_path}", flush=True)


if __name__ == "__main__":
    main()
