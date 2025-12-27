import os
import json
import re
from typing import Dict, Optional
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv  # type: ignore
from filelock import FileLock  # type: ignore

load_dotenv()

USE_AI = os.getenv("USE_AI", "false").strip().lower() == "true"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

CACHE_TTL_DAYS = 10

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_FILE = os.path.join(BASE_DIR, "nutrition_cache.json")
LOCK_FILE = CACHE_FILE + ".lock"
lock = FileLock(LOCK_FILE)

_client = None

def _get_openai_client():
    """Initialize and return the OpenAI client."""
    global _client
    if _client is None:
        if not OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY not set")
        import openai  # type: ignore
        _client = openai.OpenAI(api_key=OPENAI_API_KEY)
    return _client

EMPTY_NUTRITION = {
    "calories": 0,
    "protein": 0.0,
    "carbs": 0.0,
    "fat": 0.0,
    "micros": {},
    "from_cache": False
}

def _normalize_food(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\w\s]", "", text)
    return text

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _is_expired(cached_at: str) -> bool:
    try:
        ts = datetime.fromisoformat(cached_at.replace("Z", "+00:00"))
        return _now_utc() - ts > timedelta(days=CACHE_TTL_DAYS)
    except Exception:
        return True

def _safe_float(value, default=0.0) -> float:
    try:
        return float(str(value).replace("mg", "").replace("g", "").replace("µg", ""))
    except Exception:
        return default

def _sanitize_nutrition(data: Dict) -> Dict:
    if not isinstance(data, dict):
        return EMPTY_NUTRITION.copy()

    micros = {}
    for k, v in data.get("micros", {}).items():
        micros[k] = _safe_float(v)

    return {
        "calories": int(_safe_float(data.get("calories", 0))),
        "protein": _safe_float(data.get("protein", 0.0)),
        "carbs": _safe_float(data.get("carbs", 0.0)),
        "fat": _safe_float(data.get("fat", 0.0)),
        "micros": micros,
        "from_cache": False
    }

def _load_cache() -> Dict:
    with lock:
        if not os.path.exists(CACHE_FILE):
            return {}
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

def _save_cache(cache: Dict):
    with lock:
        tmp_file = CACHE_FILE + ".tmp"
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)
        os.replace(tmp_file, CACHE_FILE)

def _get_cached_nutrition(food_text: str) -> Optional[Dict]:
    key = _normalize_food(food_text)
    cache = _load_cache()
    entry = cache.get(key)
    if not entry:
        return None

    if _is_expired(entry.get("cached_at", "")):
        cache.pop(key, None)
        _save_cache(cache)
        return None

    nutrition = entry.get("nutrition")
    if nutrition:
        nutrition_copy = nutrition.copy()
        nutrition_copy["from_cache"] = True
        return nutrition_copy
    return None

def _set_cached_nutrition(food_text: str, nutrition: Dict):
    key = _normalize_food(food_text)
    cache = _load_cache()
    cache[key] = {
        "nutrition": nutrition,
        "cached_at": _now_utc().isoformat().replace("+00:00", "Z")
    }
    _save_cache(cache)

def delete_cached_food(food_text: str) -> bool:
    key = _normalize_food(food_text)
    cache = _load_cache()
    if key in cache:
        del cache[key]
        _save_cache(cache)
        return True
    return False

def estimate_nutrition(food_text: str, use_ai: Optional[bool] = None) -> Dict:
    """
    Estimate nutrition using AI with 10-day cache.
    Returns a valid nutrition dict.
    If use_ai=True, skips cache and calls AI directly.
    """
    ai_flag = use_ai if use_ai is not None else USE_AI

    if not ai_flag:
        result = EMPTY_NUTRITION.copy()
        result["from_cache"] = False
        return result

    # Only check cache if use_ai param is not explicitly True
    if use_ai is None:
        cached = _get_cached_nutrition(food_text)
        if cached:
            return cached

    try:
        client = _get_openai_client()

        prompt = f"""
You are a nutrition expert.
Estimate nutrition for the food below.

Return ONLY valid JSON in this format:
{{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "micros": {{
    "iron": "Xmg",
    "calcium": "Xmg"
  }}
}}

Food: "{food_text}"
"""
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt.strip()}],
            temperature=0
        )

        raw = response.choices[0].message.content.strip()
        parsed = json.loads(raw)

        nutrition = _sanitize_nutrition(parsed)
        nutrition["from_cache"] = False

        # Save to cache (without the from_cache flag)
        cached_version = nutrition.copy()
        cached_version.pop("from_cache", None)
        _set_cached_nutrition(food_text, cached_version)

        return nutrition

    except json.JSONDecodeError:
        print("AI returned invalid JSON for nutrition")
        result = EMPTY_NUTRITION.copy()
        result["from_cache"] = False
        return result
    except Exception as e:
        print("AI nutrition error:", e)
        result = EMPTY_NUTRITION.copy()
        result["from_cache"] = False
        return result
