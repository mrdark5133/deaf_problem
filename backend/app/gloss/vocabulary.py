"""Vocabulary loader and synonym resolver for ASL glossing."""

import json
from pathlib import Path
from typing import Any

from ..schemas import GlossToken


class Vocabulary:
    """Manages canonical ASL sign vocabulary and synonym lookup."""

    def __init__(self, vocab_file: Path | str | None = None):
        if vocab_file is None:
            root_dir = Path(__file__).resolve().parent.parent.parent.parent
            vocab_file = root_dir / "data" / "vocabulary.json"

        self.vocab_file = Path(vocab_file)
        self.gloss_map: dict[str, dict[str, Any]] = {}
        self.synonym_map: dict[str, str] = {}
        self.load()

    def load(self) -> None:
        """Load vocabulary from JSON file."""
        if not self.vocab_file.exists():
            return

        with open(self.vocab_file, encoding="utf-8") as f:
            data = json.load(f)

        # First pass: map synonyms
        for item in data.get("signs", []):
            gloss = item["gloss"].upper()
            clip_id = item["id"]
            self.gloss_map[gloss] = {
                "id": clip_id,
                "gloss": gloss,
                "category": item.get("category", "general"),
            }
            for syn in item.get("synonyms", []):
                self.synonym_map[syn.lower()] = gloss

        # Second pass: direct canonical names take top priority
        for item in data.get("signs", []):
            gloss = item["gloss"].upper()
            clip_id = item["id"]
            self.synonym_map[clip_id.lower()] = gloss
            self.synonym_map[gloss.lower()] = gloss

    def lookup(self, word_or_phrase: str) -> GlossToken | None:
        """Look up word or phrase in vocabulary, returning GlossToken if found."""
        cleaned = word_or_phrase.strip().lower()
        if not cleaned:
            return None

        # Check direct or synonym mapping
        gloss = self.synonym_map.get(cleaned)
        if not gloss and cleaned.upper() in self.gloss_map:
            gloss = cleaned.upper()

        if gloss and gloss in self.gloss_map:
            info = self.gloss_map[gloss]
            return GlossToken(
                gloss=gloss,
                kind="sign",
                clip_id=info["id"],
                source=word_or_phrase,
            )

        return None


# Global singleton instance
vocabulary = Vocabulary()
