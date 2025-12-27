from fastapi import APIRouter, Query # type: ignore
from pydantic import BaseModel # type: ignore
from app.services.ai import estimate_nutrition

router = APIRouter(prefix="/estimate")

class FoodEstimateRequest(BaseModel):
    food_text: str

class NutritionResponse(BaseModel):
    calories: int
    protein: float
    carbs: float
    fat: float
    micros: dict
    from_cache: bool

class FoodEstimateResponse(BaseModel):
    nutrition: NutritionResponse

@router.post("", response_model=FoodEstimateResponse)
def estimate_food(
    request: FoodEstimateRequest,
    use_ai: bool = Query(None, description="Override USE_AI and skip cache if true")
):
    nutrition = estimate_nutrition(request.food_text, use_ai=use_ai)
    return {"nutrition": nutrition}
