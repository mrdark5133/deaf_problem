"""ASL Grammar rules and structural transformations."""

from typing import Any

from spacy.tokens import Doc

# Time indicator terms to front in ASL grammar
TIME_WORDS = {
    "yesterday",
    "today",
    "tomorrow",
    "now",
    "morning",
    "afternoon",
    "evening",
    "night",
    "soon",
    "later",
}

# Wh-words to move to the end in ASL grammar
WH_WORDS = {
    "what",
    "where",
    "when",
    "who",
    "whom",
    "why",
    "how",
    "which",
}

# Articles to drop
ARTICLES = {"a", "an", "the"}

# Copulas and aux be-verbs to drop
COPULAS = {"is", "am", "are", "be", "being", "been", "was", "were", "'s", "'re", "'m"}

# Auxiliary verbs and conjunctions/prepositions typically dropped in ASL gloss
AUX_VERBS = {"do", "does", "did", "can", "could", "would", "should", "may", "might"}
FUNCTION_WORDS = {"at", "in", "on", "to", "for", "with", "of", "and", "or", "but"}

# Pronoun mapping table
PRONOUN_MAP = {
    "i": "ME",
    "me": "ME",
    "myself": "ME",
    "my": "MY",
    "mine": "MY",
    "you": "YOU",
    "yourself": "YOU",
    "your": "YOUR",
    "yours": "YOUR",
    "we": "WE",
    "us": "WE",
    "our": "OUR",
    "ours": "OUR",
}

# Negation words (verbal negations)
NEGATION_WORDS = {
    "not",
    "n't",
    "dont",
    "don't",
    "doesnt",
    "doesn't",
    "didnt",
    "didn't",
    "cant",
    "can't",
    "cannot",
    "wont",
    "won't",
    "never",
}


def detect_question_and_type(
    raw_text: str, doc: Doc | None = None
) -> tuple[bool, str | None]:
    """Detect if input is a question and classify as 'wh' or 'yes_no'."""
    text_lower = raw_text.lower().strip()
    is_q_mark = text_lower.endswith("?")

    words = [w.strip(".,?!'\"") for w in text_lower.split() if w.strip(".,?!'\"")]
    if not words:
        return False, None

    # Check if any wh-word appears
    has_wh = any(w in WH_WORDS for w in words)
    if has_wh:
        return True, "wh"

    # Check for auxiliary question starts
    aux_starts = {
        "do",
        "does",
        "did",
        "is",
        "are",
        "am",
        "was",
        "were",
        "can",
        "could",
        "will",
        "would",
        "should",
        "may",
        "might",
        "have",
        "has",
        "had",
    }

    if is_q_mark or words[0] in aux_starts:
        return True, "yes_no"

    return False, None


def transform_sentence_tokens(
    doc: Doc, is_question: bool, q_type: str | None
) -> list[dict[str, Any]]:
    """
    Apply ASL grammatical transformations to tokens in a sentence:
    1. Extract time words (moved to front)
    2. Extract wh-words (moved to end if question)
    3. Detect past/future tense markers (FINISH / WILL)
    4. Filter copulas, articles, auxiliary verbs, and prepositions
    5. Retain content words (subject, verb, object, adjectives, adverbs)
    """
    time_tokens: list[dict[str, Any]] = []
    wh_tokens: list[dict[str, Any]] = []
    core_tokens: list[dict[str, Any]] = []
    has_past_tense = False
    has_future_tense = False

    for token in doc:
        # Skip pure punctuation and space
        if token.is_punct or token.is_space:
            continue

        raw_lower = token.text.lower()
        lemma_lower = token.lemma_.lower()

        # Check multi-word contraction or apostrophes
        if raw_lower in ["'s", "'m", "'re", "'ve", "'ll", "'d"]:
            if raw_lower == "'ll":
                has_future_tense = True
            continue

        # Check for articles
        if raw_lower in ARTICLES:
            continue

        # Check for copulas / be-verbs
        if raw_lower in COPULAS or (token.lemma_ == "be" and token.pos_ == "AUX"):
            if raw_lower in ["was", "were"]:
                has_past_tense = True
            continue

        # Check for auxiliary do / did / does / can / could
        if raw_lower in AUX_VERBS:
            if raw_lower == "did":
                has_past_tense = True
            continue

        # Check for function words (prepositions / conjunctions)
        if raw_lower in FUNCTION_WORDS:
            continue

        # Check for tense indicators
        if raw_lower in ["will", "shall", "gonna"] or (
            raw_lower == "going" and token.head.lemma_ == "go"
        ):
            has_future_tense = True
            continue

        if token.tag_ in ["VBD", "VBN"] and raw_lower not in COPULAS:
            has_past_tense = True

        # Check for time words (to be fronted)
        if raw_lower in TIME_WORDS or lemma_lower in TIME_WORDS:
            time_tokens.append(
                {
                    "raw": token.text,
                    "lemma": token.lemma_,
                    "pos": token.pos_,
                    "idx": token.idx,
                    "type": "time",
                }
            )
            continue

        # Check for wh-words
        if raw_lower in WH_WORDS:
            wh_tokens.append(
                {
                    "raw": token.text,
                    "lemma": token.lemma_,
                    "pos": token.pos_,
                    "idx": token.idx,
                    "type": "wh",
                }
            )
            continue

        # Check for standalone 'no' (social sign)
        if raw_lower == "no":
            core_tokens.append(
                {
                    "raw": token.text,
                    "lemma": "no",
                    "pos": "INTJ",
                    "idx": token.idx,
                    "type": "core",
                }
            )
            continue

        # Check for negation
        if raw_lower in NEGATION_WORDS or token.dep_ == "neg":
            core_tokens.append(
                {
                    "raw": "not",
                    "lemma": "not",
                    "pos": "ADV",
                    "idx": token.idx,
                    "type": "negation",
                }
            )
            continue

        # Core word
        core_tokens.append(
            {
                "raw": token.text,
                "lemma": token.lemma_,
                "pos": token.pos_,
                "tag": token.tag_,
                "idx": token.idx,
                "type": "core",
            }
        )

    # Assemble ASL ordering: [TIME] -> [CORE (TOPIC + COMMENT)] -> [TENSE] -> [WH-QUESTION]
    ordered_items: list[dict[str, Any]] = []

    # 1. Front time words
    ordered_items.extend(time_tokens)

    # 2. Add core tokens (subject, object, verbs, negation)
    ordered_items.extend(core_tokens)

    # 3. Add tense marker if past and not already covered by a time word like yesterday
    if has_past_tense and not any(t["lemma"] == "yesterday" for t in time_tokens):
        ordered_items.append(
            {
                "raw": "finish",
                "lemma": "finish",
                "pos": "ADV",
                "idx": 9990,
                "type": "tense",
            }
        )
    elif has_future_tense and not any(
        t["lemma"] in ["tomorrow", "soon"] for t in time_tokens
    ):
        ordered_items.append(
            {
                "raw": "will",
                "lemma": "will",
                "pos": "AUX",
                "idx": 9990,
                "type": "tense",
            }
        )

    # 4. Wh-words at the end
    ordered_items.extend(wh_tokens)

    return ordered_items
