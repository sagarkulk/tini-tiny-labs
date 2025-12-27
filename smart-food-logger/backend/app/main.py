from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore

from app.routes.estimate import router as estimate_router
from app.routes.daily import router as daily_router
from app.routes.ai_cache import router as ai_cache_router


app = FastAPI(
    title="Smart Food Logger API",
    version="v1"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(estimate_router)
app.include_router(daily_router)
app.include_router(ai_cache_router)

