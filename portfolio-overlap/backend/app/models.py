from pydantic import BaseModel, validator
from typing import List

class PortfolioItem(BaseModel):
    ticker: str
    weight: float  # percentage

class PortfolioRequest(BaseModel):
    positions: List[PortfolioItem]

    @validator("positions")
    def validate_total_weight(cls, positions):
        total = sum(p.weight for p in positions)
        if round(total, 2) != 100:
            raise ValueError("Total allocation must equal 100%")
        return positions
