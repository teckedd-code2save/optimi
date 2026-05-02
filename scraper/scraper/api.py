"""
FastAPI bridge for the Optimi scraping engine + AI Assistant.

Run locally (from the project root)::

    uvicorn scraper.api:app --reload --port 8000

Or from inside the scraper/ directory::

    cd scraper
    uvicorn api:app --reload --port 8000

Endpoints:
    POST /scrape         → scrape a single URL
    POST /scrape-batch   → scrape multiple URLs
    POST /api/ai/generate → generate AI draft via OpenAI
    GET  /api/ai/status  → check if OpenAI is configured
    GET  /health         → health check
"""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path
from typing import List, Optional

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "FastAPI dependencies not installed. "
        "Run: pip install fastapi uvicorn pydantic"
    ) from exc

from .engine import ScrapingEngine
from .models import ScrapedOpportunity
from .ai import generate_draft, is_configured

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    stream=sys.stderr,
)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Optimi Scraper API",
    description="HTTP bridge for the Optimi opportunity scraping engine and AI Assistant.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production via reverse proxy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_engine: ScrapingEngine | None = None


def _get_engine() -> ScrapingEngine:
    global _engine
    if _engine is None:
        _engine = ScrapingEngine()
    return _engine


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class ScrapeRequest(BaseModel):
    url: str


class ScrapeBatchRequest(BaseModel):
    urls: List[str]


class ScrapeResponse(BaseModel):
    source_url: str
    title: str | None
    organization: str | None
    opportunity_type: str | None
    description: str | None
    deadline: str | None
    location: str | None
    prizes: str | None
    requirements: List[str]
    application_url: str | None
    raw_text: str | None
    confidence: float
    extraction_method: str


def _to_response(op: ScrapedOpportunity) -> ScrapeResponse:
    return ScrapeResponse(**op.to_dict())


class AIGenerateRequest(BaseModel):
    template: str = Field(..., description="e.g. Cover Letter, Project Proposal, Grant Essay")
    tone: str = Field(default="professional", description="professional, enthusiastic, technical, casual")
    fields: dict[str, str] = Field(default_factory=dict, description="User-filled form fields")
    opportunity: Optional[dict] = Field(default=None, description="Opportunity metadata for context")
    model: str = Field(default="gpt-4o-mini", description="OpenAI model ID")


class AIGenerateResponse(BaseModel):
    content: str
    model: str
    word_count: int


class AIStatusResponse(BaseModel):
    configured: bool


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "optimi-scraper", "version": "0.2.0"}


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape(req: ScrapeRequest) -> ScrapeResponse:
    """Scrape a single URL and return structured opportunity data."""
    engine = _get_engine()
    result = await asyncio.to_thread(engine.scrape, req.url)
    return _to_response(result)


@app.post("/scrape-batch", response_model=List[ScrapeResponse])
async def scrape_batch(req: ScrapeBatchRequest) -> List[ScrapeResponse]:
    """Scrape multiple URLs sequentially."""
    engine = _get_engine()
    results = await asyncio.to_thread(engine.scrape_multiple, req.urls)
    return [_to_response(r) for r in results]


@app.get("/api/ai/status", response_model=AIStatusResponse)
async def ai_status() -> AIStatusResponse:
    """Check whether the OpenAI integration is configured."""
    return AIStatusResponse(configured=is_configured())


@app.post("/api/ai/generate", response_model=AIGenerateResponse)
async def ai_generate(req: AIGenerateRequest) -> AIGenerateResponse:
    """Generate an application draft using OpenAI."""
    if not is_configured():
        raise HTTPException(status_code=503, detail="OpenAI not configured on backend. Set OPENAI_API_KEY.")
    content = await asyncio.to_thread(
        generate_draft,
        template=req.template,
        tone=req.tone,
        fields=req.fields,
        opportunity=req.opportunity,
        model=req.model,
    )
    word_count = len(content.split())
    return AIGenerateResponse(content=content, model=req.model, word_count=word_count)
