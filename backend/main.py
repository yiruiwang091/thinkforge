"""
ThinkForge Backend - FastAPI Application
========================================
AI-powered argumentation assistant API.

This is the entry point for the FastAPI server. It exposes:
- GET /health   : liveness probe
- POST /analyze : (stub) analyzes an argument and returns multi-perspective critiques.

Design notes (NLP/ML reasoning):
- We separate the *transport layer* (FastAPI) from the *reasoning layer* (Claude prompting),
  so we can swap models, add RAG retrieval, or add caching without touching routes.
- The /analyze response schema mirrors the *debate tree* the frontend will render:
  each node has a `type` (counter, support, socratic) and an optional `children` list.
  This is the same shape we'll use once we wire Claude in, so the frontend stays stable.
"""

from __future__ import annotations

import logging
import os
from typing import List, Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from claude_client import analyze_argument
from personality_router import router as pet_router

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
load_dotenv()  # read .env if present (ANTHROPIC_API_KEY, etc.)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("thinkforge")

# Comma-separated list of allowed origins for CORS. Defaults to local Vite dev.
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",")

app = FastAPI(
    title="ThinkForge API",
    version="0.1.0",
    description="AI-powered argumentation assistant and critical thinking tool.",
)

# CORS so the Vite frontend (default :5173) can call us during local dev.
app.include_router(pet_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
PerspectiveType = Literal["counter", "support", "socratic"]


class AnalyzeRequest(BaseModel):
    """Inbound payload for /analyze."""

    argument: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="The argument or claim the user wants critiqued.",
    )
    context: Optional[str] = Field(
        default=None,
        max_length=10000,
        description="Optional additional context (e.g. background info, source text).",
    )


class Perspective(BaseModel):
    """One node in the debate tree."""

    type: PerspectiveType
    title: str
    content: str
    # Children allow recursive critique (counter-to-counter, etc.). Stub is shallow.
    children: List["Perspective"] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    """Outbound payload for /analyze."""

    argument: str
    summary: str
    perspectives: List[Perspective]
    arena_event: Optional[str] = Field(
        default=None,
        description="一句话收获，供前端触发星球联动事件",
    )
    model: str = "claude-opus-4-6"


# Allow recursive Perspective model (Pydantic v2 forward-ref resolution).
Perspective.model_rebuild()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health", tags=["meta"])
def health() -> dict:
    """Liveness probe used by Render / uptime checks."""
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse, tags=["analysis"])
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    """
    Analyze an argument from multiple critical-thinking perspectives using Claude.

    Returns:
    - summary: neutral one-liner of the argument
    - perspectives: counter / support / socratic (each 2-3 sentences)
    - arena_event: one-sentence takeaway for planet linkage
    """
    if not payload.argument.strip():
        raise HTTPException(status_code=400, detail="Argument must not be empty.")

    logger.info("analyze called | length=%d", len(payload.argument))

    try:
        data = analyze_argument(
            argument=payload.argument,
            context=payload.context,
        )
    except ValueError as e:
        logger.error("analyze parse error: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Claude 返回格式异常，请重试：{str(e)}",
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    perspectives = [Perspective(**p) for p in data.get("perspectives", [])]

    return AnalyzeResponse(
        argument=payload.argument,
        summary=data.get("summary", ""),
        perspectives=perspectives,
        arena_event=data.get("arena_event"),
    )


# ---------------------------------------------------------------------------
# Local dev entry point: `python main.py`
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
