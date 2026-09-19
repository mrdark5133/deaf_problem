"""Fingerspelling fallback handler for ASL."""

import re

from ..schemas import GlossToken


def is_alphanumeric_word(word: str) -> bool:
    """Check if word contains alphanumeric characters suitable for fingerspelling."""
    return bool(re.search(r"[a-zA-Z0-9]", word))


def create_fingerspell_token(word: str) -> GlossToken:
    """Create a fingerspell token for an out-of-vocabulary word or number."""
    # Keep alphanumeric characters and convert to uppercase letters
    letters = [ch.upper() for ch in word if ch.isalnum()]
    cleaned_word = "".join(letters)

    return GlossToken(
        gloss=f"FS:{cleaned_word}" if cleaned_word else "FS:?",
        kind="fingerspell",
        clip_id=f"fs_{cleaned_word.lower()}" if cleaned_word else "fs_unknown",
        source=word,
        letters=letters,
    )
