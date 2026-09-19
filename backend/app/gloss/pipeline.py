"""ASL Gloss translation pipeline orchestrator."""

import re
import time

import spacy

from ..schemas import GlossToken, TranslateRequest, TranslateResponse
from .fingerspell import create_fingerspell_token, is_alphanumeric_word
from .rules import PRONOUN_MAP, detect_question_and_type, transform_sentence_tokens
from .vocabulary import vocabulary

# Multi-word idioms and expressions mapped directly to canonical glosses
MULTI_WORD_EXPRESSIONS = [
    (re.compile(r"\bnice\s+to\s+meet\s+you\b", re.IGNORECASE), ["NICE-TO-MEET-YOU"]),
    (
        re.compile(r"\bthank\s+you\s+very\s+much\b", re.IGNORECASE),
        ["THANK-YOU", "FS:VERY", "FS:MUCH"],
    ),
    (re.compile(r"\bthank\s+you\b", re.IGNORECASE), ["THANK-YOU"]),
    (re.compile(r"\bthank\s+u\b", re.IGNORECASE), ["THANK-YOU"]),
    (re.compile(r"\bsee\s+you\b", re.IGNORECASE), ["GOODBYE"]),
    (re.compile(r"\bhow\s+are\s+you\b", re.IGNORECASE), ["HOW-ARE-YOU"]),
    (re.compile(r"\bgood\s+morning\b", re.IGNORECASE), ["GOOD", "MORNING"]),
]


class GlossPipeline:
    """Orchestrates text normalization, spaCy NLP analysis, ASL grammar rules, and gloss resolution."""

    def __init__(self):
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except (OSError, ValueError):
            self.nlp = spacy.blank("en")

    def normalize_input(self, text: str) -> str:
        """Sanitize, normalize casing, and truncate excessively long inputs."""
        if not text:
            return ""

        cleaned = re.sub(r"[\r\n\t]+", " ", text)
        cleaned = re.sub(r"[^\w\s.,?!'\-]", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        words = cleaned.split(" ")
        if len(words) > 50:
            cleaned = " ".join(words[:50])

        return cleaned

    def translate(self, request: TranslateRequest) -> TranslateResponse:
        """Translate input English text to structured ASL Gloss tokens."""
        start_time = time.perf_counter()

        raw_text = request.text or ""
        normalized = self.normalize_input(raw_text)

        if not normalized:
            return TranslateResponse(
                seq=request.seq,
                original=raw_text,
                is_question=False,
                question_type=None,
                tokens=[],
                processing_ms=max(1, int((time.perf_counter() - start_time) * 1000)),
            )

        # 1. Determine question status and type from raw text
        is_q, q_type = detect_question_and_type(raw_text)

        # 2. Check for multi-word phrases and substitute placeholders
        processed_text = normalized
        matched_expressions: list[tuple[int, list[str]]] = []

        for pattern, gloss_list in MULTI_WORD_EXPRESSIONS:
            for match in pattern.finditer(processed_text):
                matched_expressions.append((match.start(), gloss_list))
            # Replace matching range with spaces of equal length to preserve char offsets
            processed_text = pattern.sub(
                lambda m: " " * len(m.group(0)), processed_text
            )

        # 3. Apply ASL grammar transforms
        doc = self.nlp(processed_text)
        transformed_items = transform_sentence_tokens(doc, is_q, q_type)

        # Separate time tokens, wh tokens, tense tokens, and core tokens
        time_tokens: list[GlossToken] = []
        core_and_multi_tokens: list[tuple[int, GlossToken]] = []
        tense_tokens: list[GlossToken] = []
        wh_tokens: list[GlossToken] = []

        # Add multi-word expression tokens to candidate list with their original start index
        for start_idx, gloss_list in matched_expressions:
            for offset, g in enumerate(gloss_list):
                if g.startswith("FS:"):
                    raw_w = g[3:]
                    core_and_multi_tokens.append(
                        (start_idx + offset, create_fingerspell_token(raw_w))
                    )
                else:
                    tok = vocabulary.lookup(g) or GlossToken(
                        gloss=g,
                        kind="sign",
                        clip_id=g.lower().replace("_", "-"),
                        source=g,
                    )
                    core_and_multi_tokens.append((start_idx + offset, tok))

        for item in transformed_items:
            raw_word = item["raw"]
            lemma = item["lemma"].lower()
            lower_raw = raw_word.lower()
            item_type = item.get("type", "core")
            idx = item.get("idx", 0)

            # Resolve token
            tok: GlossToken | None = None

            if item_type == "negation":
                tok = vocabulary.lookup("not") or GlossToken(
                    gloss="NOT",
                    kind="sign",
                    clip_id="not",
                    source=raw_word,
                )
            elif lower_raw in PRONOUN_MAP:
                mapped_gloss = PRONOUN_MAP[lower_raw]
                tok = vocabulary.lookup(mapped_gloss) or GlossToken(
                    gloss=mapped_gloss,
                    kind="sign",
                    clip_id=mapped_gloss.lower(),
                    source=raw_word,
                )
            else:
                tok = vocabulary.lookup(lower_raw) or vocabulary.lookup(lemma)
                if tok:
                    tok.source = raw_word
                elif is_alphanumeric_word(raw_word):
                    tok = create_fingerspell_token(raw_word)

            if not tok:
                continue

            # Assign to proper ASL bucket
            if item_type == "time":
                time_tokens.append(tok)
            elif item_type == "wh":
                wh_tokens.append(tok)
            elif item_type == "tense":
                tense_tokens.append(tok)
            else:
                core_and_multi_tokens.append((idx, tok))

        # Sort core & multi-word tokens by their occurrence offset in the sentence
        core_and_multi_tokens.sort(key=lambda x: x[0])

        # Final ASL gloss ordering: [TIME] -> [CORE & MULTI-WORDS] -> [TENSE] -> [WH-QUESTION]
        final_tokens: list[GlossToken] = []
        final_tokens.extend(time_tokens)
        for _, tok in core_and_multi_tokens:
            final_tokens.append(tok)
        final_tokens.extend(tense_tokens)
        final_tokens.extend(wh_tokens)

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)

        return TranslateResponse(
            seq=request.seq,
            original=raw_text,
            is_question=is_q,
            question_type=q_type,
            tokens=final_tokens,
            processing_ms=max(1, elapsed_ms),
        )


gloss_pipeline = GlossPipeline()
