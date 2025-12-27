import os
import json
import re
from typing import Dict, Optional
from filelock import FileLock  # type: ignore

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_FILE = os.path.join(BASE_DIR, "nutrition_cache.json")
LOCK_FILE = CACHE_FILE + ".lock"

lock = FileLock(LOCK_FILE)

def _normalize_food(text: str) -> str:
    """
    Normalize food text so similar inputs map to the same key.
    """
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\w\s]", "", text)
    return text


def _load_cache() -> Dict[str, Dict]:
    with lock:
        if not os.path.exists(CACHE_FILE):
            return {}
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)


def _save_cache(cache: Dict[str, Dict]):
    with lock:
        tmp_file = CACHE_FILE + ".tmp"
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2)
        os.replace(tmp_file, CACHE_FILE)


def get_cached_nutrition(food_text: str) -> Optional[Dict]:
    """
    Get cached nutrition data for a normalized food text.
    """
    key = _normalize_food(food_text)
    cache = _load_cache()
    entry = cache.get(key)

    if entry is not None:
        entry["from_cache"] = True  # mark data as coming from cache
    return entry


def set_cached_nutrition(food_text: str, nutrition: Dict):
    """
    Store nutrition data in cache with normalized key.
    """
    key = _normalize_food(food_text)
    cache = _load_cache()
    cache[key] = nutrition
    _save_cache(cache)


def delete_cached_food(food_text: str) -> bool:
    """
    Delete a cached nutrition entry.
    Returns True if deleted, False if not found.
    """
    key = _normalize_food(food_text)
    cache = _load_cache()
    if key in cache:
        del cache[key]
        _save_cache(cache)
        return True
    return False
