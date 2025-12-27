from fastapi import APIRouter, Query # type: ignore
from pydantic import BaseModel # type: ignore
from app.services.ai import delete_cached_food

router = APIRouter(prefix="/cache")

class DeleteCacheRequest(BaseModel):
    food_text: str

class DeleteCacheResponse(BaseModel):
    success: bool

@router.delete("/delete", response_model=DeleteCacheResponse)
def delete_food_cache(food_text: str = Query(..., description="Food text to delete from cache")):
    """
    Delete a cached food entry from nutrition cache.
    """
    success = delete_cached_food(food_text)
    return {"success": success}
