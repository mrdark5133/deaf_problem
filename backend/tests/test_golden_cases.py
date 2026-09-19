"""Golden case testing for ASL Gloss engine."""

import json
from pathlib import Path

from backend.app.gloss.pipeline import gloss_pipeline
from backend.app.schemas import TranslateRequest


def test_golden_cases_pass_rate():
    fixture_path = Path(__file__).parent / "fixtures" / "gloss_cases.json"
    with open(fixture_path, encoding="utf-8") as f:
        data = json.load(f)

    cases = data["cases"]
    assert len(cases) >= 40, f"Expected at least 40 cases, got {len(cases)}"

    passed = 0
    failures = []

    for idx, case in enumerate(cases):
        text = case["input"]
        expected_glosses = case["expected_glosses"]
        expected_is_q = case["is_question"]
        expected_q_type = case["question_type"]

        resp = gloss_pipeline.translate(
            TranslateRequest(text=text, is_final=True, seq=idx)
        )
        actual_glosses = [t.gloss for t in resp.tokens]

        # Check question classification
        if resp.is_question != expected_is_q:
            failures.append(
                f"Case {idx} ('{text}'): is_question expected {expected_is_q}, got {resp.is_question}"
            )
            continue

        if resp.question_type != expected_q_type:
            failures.append(
                f"Case {idx} ('{text}'): question_type expected {expected_q_type}, got {resp.question_type}"
            )
            continue

        # Check gloss sequence matching
        if actual_glosses != expected_glosses:
            failures.append(
                f"Case {idx} ('{text}'):\n  Expected: {expected_glosses}\n  Actual:   {actual_glosses}"
            )
            continue

        passed += 1

    failure_msg = "\n".join(failures)
    assert passed == len(cases), f"{len(failures)} cases failed:\n{failure_msg}"
