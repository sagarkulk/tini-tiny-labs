from pydantic import BaseModel, Field # type: ignore
from typing import Dict

class FoodEstimateRequest(BaseModel):
    food_text: str

class Nutrition(BaseModel):
    calories: int
    protein: float
    carbs: float
    fat: float
    micros: Dict[str, float] = Field(default_factory=dict)

class FoodEstimateResponse(BaseModel):
    nutrition: Nutrition
