import os
import json
import re
from typing import List, Dict, Optional
from dotenv import load_dotenv # type: ignore
load_dotenv()

USE_AI = os.getenv("USE_AI", "false").strip().lower() == "true"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

_client = None

def _get_openai_client():
    global _client
    if _client is None:
        if not OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY not set")
        import openai # type: ignore
        _client = openai.OpenAI(api_key=OPENAI_API_KEY)
    return _client

RECIPE_DB = [
    {"name": "Egg Omelet", "calories": 250, "type": "breakfast", "link": "https://example.com/egg-omelet"},
    {"name": "Grilled Chicken Salad", "calories": 400, "type": "lunch", "link": "https://example.com/chicken-salad"},
    {"name": "Apple Snack", "calories": 100, "type": "snack", "link": "https://example.com/apple-snack"},
    {"name": "Rice & Chicken", "calories": 500, "type": "dinner", "link": "https://example.com/rice-chicken"},
]

def _normalize_food_type(food_type: Optional[str]) -> Optional[str]:
    return food_type.lower() if food_type else None

def _contains_allowed_food(name: str, allowed_foods: List[str]) -> bool:
    name_lower = name.lower()
    for food in allowed_foods:
        if re.search(rf"\b{re.escape(food.lower())}\b", name_lower):
            return True
    return False

def _sanitize_ai_recipe(item: Dict) -> Optional[Dict]:
    required = {"name", "calories", "type", "link"}
    if not isinstance(item, dict) or not required.issubset(item):
        return None
    if not isinstance(item["calories"], (int, float)):
        return None
    if not isinstance(item["link"], str) or not item["link"].startswith("http"):
        return None
    return {
        "name": str(item["name"]),
        "calories": int(item["calories"]),
        "type": str(item["type"]).lower(),
        "link": item["link"]
    }

def get_recipes_from_ai(
    allowed_foods: List[str],
    food_type: Optional[str] = None,
    max_calories: Optional[int] = None
) -> List[Dict]:
    """
    Call OpenAI to get recipe suggestions.
    Returns list[dict], max 10 items.
    """
    client = _get_openai_client()
    food_type = _normalize_food_type(food_type)

    prompt = f"""
Suggest up to 10 {food_type or 'any'} recipes.
Allowed foods: {', '.join(allowed_foods)}.
Max calories: {max_calories or 'no limit'}.
Return ONLY valid JSON (no markdown, no explanation).
Each item must include: name, calories, type, link.
Sort by calories ascending.
"""
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt.strip()}],
            temperature=0
        )

        raw = response.choices[0].message.content.strip()
        print("AI RAW RESPONSE:", raw)

        data = json.loads(raw)

        if isinstance(data, dict):
            data = [data]

        if not isinstance(data, list):
            return []

        cleaned = []
        for item in data:
            recipe = _sanitize_ai_recipe(item)
            if recipe:
                if max_calories is None or recipe["calories"] <= max_calories:
                    cleaned.append(recipe)

        return cleaned[:10]

    except json.JSONDecodeError:
        print("AI returned invalid JSON")
        return []
    except Exception as e:
        print("AI recipe fetch error:", e)
        return []

def suggest_recipes(
    allowed_foods: List[str],
    food_type: Optional[str] = None,
    max_calories: Optional[int] = None,
    use_ai: Optional[bool] = None
) -> Dict:
    """
    Suggest recipes using AI or mock fallback.
    """
    food_type = _normalize_food_type(food_type)
    ai_flag = use_ai if use_ai is not None else USE_AI

    recipes: List[Dict] = []
    used_ai = False

    if ai_flag and allowed_foods:
        ai_recipes = get_recipes_from_ai(
            allowed_foods=allowed_foods,
            food_type=food_type,
            max_calories=max_calories
        )
        if ai_recipes:
            recipes = ai_recipes
            used_ai = True

    if not recipes:
        # MOCK fallback
        suggestions = []
        for recipe in RECIPE_DB:
            if food_type and recipe["type"] != food_type:
                continue
            if _contains_allowed_food(recipe["name"], allowed_foods):
                if max_calories is None or recipe["calories"] <= max_calories:
                    suggestions.append(recipe)

        suggestions.sort(key=lambda r: r["calories"])
        recipes = suggestions[:10]

    return {
        "used_ai": used_ai,
        "recipes": recipes
    }
