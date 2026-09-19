"""FastAPI main application for SignBridge."""

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .gloss.pipeline import gloss_pipeline
from .schemas import HealthResponse, TranslateRequest, TranslateResponse

app = FastAPI(
    title="SignBridge API",
    description="Real-Time Speech-to-Sign-Language Translation Backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static data directory for serving sign clips and index
root_dir = Path(__file__).resolve().parent.parent.parent
data_dir = root_dir / "data"
if data_dir.exists():
    app.mount("/data", StaticFiles(directory=str(data_dir)), name="data")


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Return service health status."""
    return HealthResponse(status="ok", version="0.1.0", service="signbridge-backend")


@app.post("/api/translate", response_model=TranslateResponse)
def translate(request: TranslateRequest) -> TranslateResponse:
    """Translate English text into structured ASL gloss tokens with grammar rules."""
    return gloss_pipeline.translate(request)
