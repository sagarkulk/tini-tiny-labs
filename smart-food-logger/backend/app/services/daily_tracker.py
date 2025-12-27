import json
import os
from datetime import datetime, timezone
from typing import List, Dict, Optional
from filelock import FileLock # type: ignore

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "user_data.json")
LOCK_FILE = DATA_FILE + ".lock"
lock = FileLock(LOCK_FILE)

def load_data() -> Dict:
    with lock:
        if not os.path.exists(DATA_FILE):
            return {}
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

def save_data(data: Dict):
    with lock:
        tmp_file = DATA_FILE + ".tmp"
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp_file, DATA_FILE)

def get_user_data(user_id: str) -> Dict:
    data = load_data()
    if user_id not in data:
        data[user_id] = {
            "last_active_date": "",
            "config": {
                "total_calories_allowed": 2000,
                "allowed_basic_foods": ["egg", "chicken", "rice", "apple"]
            },
            "food_log": []
        }
        save_data(data)
    return data[user_id]

def update_user_data(user_id: str, user_data: Dict):
    data = load_data()
    data[user_id] = user_data
    save_data(data)

def _today_utc_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def check_reset_daily(user_id: str):
    """Reset food log if last_active_date != today (UTC)."""
    user_data = get_user_data(user_id)
    today = _today_utc_str()
    if user_data.get("last_active_date") != today:
        user_data["food_log"] = []
        user_data["last_active_date"] = today
        update_user_data(user_id, user_data)

def get_food_log(user_id: str) -> List[Dict]:
    check_reset_daily(user_id)
    return get_user_data(user_id)["food_log"]

def add_food(
    user_id: str,
    food_text: str,
    food_type: str,
    nutrition: Optional[Dict] = None,
    used_ai: bool = False
) -> Dict:
    check_reset_daily(user_id)
    user_data = get_user_data(user_id)
    if nutrition is None:
        nutrition = {"calories": 0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "micros": {}}
    entry = {
        "food_text": food_text,
        "food_type": food_type,
        "nutrition": nutrition,
        "used_ai": used_ai,
        "date": _today_utc_str()
    }
    user_data["food_log"].append(entry)
    update_user_data(user_id, user_data)
    return entry

def remove_food(user_id: str, index: int) -> Optional[Dict]:
    check_reset_daily(user_id)
    user_data = get_user_data(user_id)
    if 0 <= index < len(user_data["food_log"]):
        removed = user_data["food_log"].pop(index)
        update_user_data(user_id, user_data)
        return removed
    return None

def get_config(user_id: str) -> Dict:
    return get_user_data(user_id)["config"]

def update_config(
    user_id: str,
    total_calories: Optional[int] = None,
    allowed_foods: Optional[List[str]] = None
) -> Dict:
    user_data = get_user_data(user_id)
    if total_calories is not None:
        user_data["config"]["total_calories_allowed"] = total_calories
    if allowed_foods is not None:
        user_data["config"]["allowed_basic_foods"] = allowed_foods
    update_user_data(user_id, user_data)
    return user_data["config"]

def get_remaining_calories(user_id: str) -> int:
    user_data = get_user_data(user_id)
    total_allowed = user_data["config"].get("total_calories_allowed", 2000)
    used = sum(entry["nutrition"].get("calories", 0) for entry in get_food_log(user_id))
    return max(total_allowed - used, 0)
