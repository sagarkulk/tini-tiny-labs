from fastapi import APIRouter, Query # type: ignore
from pydantic import BaseModel # type: ignore
from typing import List, Optional

from app.services.daily_tracker import (
    add_food,
    remove_food,
    get_food_log,
    get_remaining_calories,
    update_config,
    get_config
)
from app.services.ai import estimate_nutrition
from app.services.recipes import suggest_recipes
import os

router = APIRouter(prefix="/daily")

class FoodEntry(BaseModel):
    food_text: str
    food_type: str  # breakfast, lunch, snack, dinner

class ConfigUpdate(BaseModel):
    total_calories_allowed: Optional[int] = None
    allowed_basic_foods: Optional[List[str]] = None

@router.get("/log")
def read_log(user_id: str = Query(..., description="User ID (GUID)")):
    """
    Get today's food log with totals and remaining calories.
    """
    log = get_food_log(user_id)

    totals = {
        "calories": 0,
        "protein": 0.0,
        "carbs": 0.0,
        "fat": 0.0,
        "micros": {}
    }

    for entry in log:
        nutrition = entry.get("nutrition", {})

        totals["calories"] += nutrition.get("calories", 0)
        totals["protein"] += nutrition.get("protein", 0.0)
        totals["carbs"] += nutrition.get("carbs", 0.0)
        totals["fat"] += nutrition.get("fat", 0.0)

        for k, v in nutrition.get("micros", {}).items():
            try:
                totals["micros"][k] = totals["micros"].get(k, 0.0) + float(str(v).replace("mg","").replace("µg",""))
            except:
                totals["micros"][k] = totals["micros"].get(k, 0.0)

    return {
        "food_log": log,
        "totals": totals,
        "remaining_calories": get_remaining_calories(user_id),
        "config": get_config(user_id)
    }

@router.post("/add")
def add_food_entry(
    entry: FoodEntry,
    user_id: str = Query(..., description="User ID (GUID)"),
    use_ai: Optional[bool] = Query(None, description="Override USE_AI env variable")
):
    """
    Add a new food entry for today.
    """
    global_use_ai = os.getenv("USE_AI", "false").lower() == "true"
    ai_flag = use_ai if use_ai is not None else global_use_ai

    if ai_flag:
        nutrition = estimate_nutrition(entry.food_text)
        used_ai = True
    else:
        nutrition = {
            "calories": 0,
            "protein": 0.0,
            "carbs": 0.0,
            "fat": 0.0,
            "micros": {}
        }
        used_ai = False

    added = add_food(
        user_id=user_id,
        food_text=entry.food_text,
        food_type=entry.food_type,
        nutrition=nutrition,
        used_ai=used_ai
    )

    return {
        "added": added,
        "remaining_calories": get_remaining_calories(user_id)
    }

@router.delete("/remove/{index}")
def remove_food_entry(
    index: int,
    user_id: str = Query(..., description="User ID (GUID)")
):
    """
    Remove a food entry by index.
    """
    removed = remove_food(user_id, index)

    return {
        "removed": removed is not None,
        "remaining_calories": get_remaining_calories(user_id)
    }

@router.put("/config")
def update_daily_config(
    config_update: ConfigUpdate,
    user_id: str = Query(..., description="User ID (GUID)")
):
    """
    Update user-specific configuration.
    """
    new_config = update_config(
        user_id=user_id,
        total_calories=config_update.total_calories_allowed,
        allowed_foods=config_update.allowed_basic_foods
    )

    return {
        "config": new_config,
        "remaining_calories": get_remaining_calories(user_id)
    }

@router.get("/recipes")
def get_recipes(
    user_id: str = Query(..., description="User ID (GUID)"),
    food_type: Optional[str] = None,
    max_calories: Optional[int] = None,
    use_ai: Optional[bool] = Query(None, description="Override USE_AI env variable")
):
    """
    Get recipe suggestions for a user.
    """
    config = get_config(user_id)
    allowed_foods = config.get("allowed_basic_foods", [])

    global_use_ai = os.getenv("USE_AI", "false").lower() == "true"
    ai_flag = use_ai if use_ai is not None else global_use_ai

    result = suggest_recipes(
        allowed_foods=allowed_foods,
        food_type=food_type,
        max_calories=max_calories,
        use_ai=ai_flag
    )

    return {
        "used_ai": result["used_ai"],
        "suggestions": result["recipes"]
    }
