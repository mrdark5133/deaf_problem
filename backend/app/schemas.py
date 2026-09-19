"""Pydantic schemas and data contracts for SignBridge API."""

from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    version: str = "0.1.0"
    service: str = "signbridge-backend"


class TranslateRequest(BaseModel):
    text: str = Field(..., description="Input text to be translated into ASL gloss")
    is_final: bool = Field(
        default=True,
        description="Whether this represents a finalized speech recognition chunk",
    )
    seq: int | None = Field(
        default=None,
        description="Monotonically increasing sequence number for ordering",
    )


class GlossToken(BaseModel):
    gloss: str = Field(..., description="ASL Gloss label in uppercase")
    kind: Literal["sign", "fingerspell"] = Field(
        ..., description="Token type: dictionary sign or fingerspelling"
    )
    clip_id: str | None = Field(
        default=None, description="Clip ID corresponding to sign library entry"
    )
    source: str | None = Field(
        default=None, description="Original source word or subphrase"
    )
    letters: list[str] | None = Field(
        default=None, description="List of uppercase letters if kind is fingerspell"
    )


class TranslateResponse(BaseModel):
    seq: int | None = Field(
        default=None, description="Sequence number echoed from request"
    )
    original: str = Field(..., description="Original input text")
    is_question: bool = Field(
        default=False, description="True if the input is a question"
    )
    question_type: Literal["wh", "yes_no"] | None = Field(
        default=None, description="wh or yes_no question classification"
    )
    tokens: list[GlossToken] = Field(
        default_factory=list, description="Ordered ASL gloss tokens"
    )
    processing_ms: int = Field(
        default=0, description="Processing latency in milliseconds"
    )
