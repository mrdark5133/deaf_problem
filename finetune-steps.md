# finetune-steps.md — Fine-tuning the gloss model and shipping it

Goal: fine-tune **T5-small** to convert English → ASL gloss, compare it honestly against your rule engine, and ship whichever configuration wins.

**Golden rule:** if the model doesn't beat or match the rules on your held-out test set, ship rules-only and say so. An honest comparison is a stronger pitch than a forced "AI" claim.

---

## Suggested schedule for tomorrow (adjust to your hours)

| Block | You | Antigravity |
|---|---|---|
| **Hour 0–1** | Paste `final-push-prompt.md`. Answer its questions. Write the **held-out test sentences** (Step 1). | F0 audit + stabilize |
| **Hour 1–4** | **Colab training** (Steps 2–6). | F1a (training kit + fake-model integration), then wait for you |
| **Hour 1–4 (parallel)** | If a signer is available: **record real signs**, demo-critical ones first. | — |
| **Hour 4–5** | Drop model files into `models/gloss-t5-ct2/`, say `approve`. | F1b (real model + evaluation) |
| **Hour 5–8** | Review each phase, test manually with mic. | F2 → F3 |
| **Hour 8–9** | Review numbers. Record backup video. | F4 → F5 |
| **Last 2–3 hours** | **Rehearse.** No new features. | Fixes only |

Real sign recordings raise perceived quality more than any model improvement, so protect that time.

---

## Step 1 — Write your held-out test set (before training)

1. Write **30+ sentences** for your three demo scenarios (doctor visit, classroom, help desk) plus a few paraphrases ("Where's the doctor?", "Can you tell me where the doctor is?").
2. Write the ASL gloss you believe is correct for each. Have a signer check them if possible.
3. Save as `data/heldout_test.jsonl`, one line each: `{"text": "...", "gloss": "..."}`.
4. **Never train on these.** The agent's build script excludes them, and a test enforces it.

---

## Step 2 — Set up Colab

1. Open Google Colab → Runtime → Change runtime type → **T4 GPU**.
2. Install:

```python
!pip install -q "transformers>=4.41" "datasets<4.0" sacrebleu sentencepiece accelerate ctranslate2
```

3. Upload `data/heldout_test.jsonl` and `data/domain_train.jsonl` (from the agent's `ml/build_domain_data.py`).

---

## Step 3 — Load and prepare the general dataset (ASLG-PC12)

The dataset (English/gloss pairs) is synthetic and has "no known license" listed in its catalog, so check the terms at its homepage before redistributing anything.

```python
from datasets import load_dataset
ds = load_dataset("achrafothman/aslg_pc12", trust_remote_code=True)["train"]
```

If loading fails (newer `datasets` versions dropped script-based datasets), either keep `datasets<4.0` as above, or download the two raw files named in the dataset's loader script (`.en` and `.asl`, from the dataset's homepage) and read them line by line into `{"text": ..., "gloss": ...}` pairs.

Prepare a **subset** so training fits your time:

```python
ds = ds.shuffle(seed=42).select(range(30000))          # 20-30k is enough
ds = ds.filter(lambda r: 1 <= len(r["text"].split()) <= 30)
split = ds.train_test_split(test_size=0.02, seed=42)
```

**Leakage check:** remove any training text that matches a held-out test sentence.

```python
import json
held = {json.loads(l)["text"].strip().lower() for l in open("heldout_test.jsonl")}
split["train"] = split["train"].filter(lambda r: r["text"].strip().lower() not in held)
```

---

## Step 4 — Stage 1: general fine-tuning

```python
from transformers import (AutoTokenizer, AutoModelForSeq2SeqLM,
                          DataCollatorForSeq2Seq, Seq2SeqTrainer, Seq2SeqTrainingArguments)

MODEL = "t5-small"                       # alternative: "google/flan-t5-small"
PREFIX = "translate English to ASL gloss: "
tok = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL)

def prep(batch):
    x = tok([PREFIX + t.strip() for t in batch["text"]], max_length=64, truncation=True)
    y = tok(text_target=[g.strip() for g in batch["gloss"]], max_length=96, truncation=True)
    x["labels"] = y["input_ids"]
    return x

tr = split["train"].map(prep, batched=True, remove_columns=["text", "gloss"])
va = split["test"].map(prep, batched=True, remove_columns=["text", "gloss"])

args = Seq2SeqTrainingArguments(
    output_dir="out_stage1", learning_rate=3e-4,
    per_device_train_batch_size=32, per_device_eval_batch_size=64,
    num_train_epochs=3, weight_decay=0.01,
    eval_strategy="epoch", save_strategy="epoch", save_total_limit=1,
    load_best_model_at_end=True, predict_with_generate=True,
    generation_max_length=96, logging_steps=100,
    fp16=False,                          # T5 can be unstable in fp16 on a T4
    report_to="none",
)
trainer = Seq2SeqTrainer(model=model, args=args, train_dataset=tr, eval_dataset=va,
                         data_collator=DataCollatorForSeq2Seq(tok, model=model), tokenizer=tok)
trainer.train()
trainer.save_model("out_stage1/best"); tok.save_pretrained("out_stage1/best")
```

Watch the validation loss. If it stops improving after epoch 1–2, stop early. Time is tight.

---

## Step 5 — Stage 2: domain adaptation (the "upgrade")

Stage 1 teaches general English → gloss. Stage 2 teaches **your demo domain and your vocabulary**.

1. Load `domain_train.jsonl` (templates × slots for doctor / classroom / help desk, labeled with your rule engine and spot-checked by you).
2. **Mix in about 10% of the general data** so the model doesn't forget how to generalize.
3. Continue from `out_stage1/best` with a lower learning rate:

```python
model = AutoModelForSeq2SeqLM.from_pretrained("out_stage1/best")
# build tr2 = domain data + ~10% general replay, tokenized with the same prep()
args2 = Seq2SeqTrainingArguments(
    output_dir="out_stage2", learning_rate=1e-4,
    per_device_train_batch_size=16, num_train_epochs=5,
    eval_strategy="epoch", save_strategy="epoch", save_total_limit=1,
    load_best_model_at_end=True, predict_with_generate=True,
    generation_max_length=96, fp16=False, report_to="none",
)
# Seq2SeqTrainer(...).train(); then save to out_stage2/best
```

**Honest framing:** domain labels come from your rules (plus your corrections), so the model here is a fast learned approximation that copes better with paraphrases and typos. It is not proof of "better ASL". Say that.

---

## Step 6 — Evaluate against the held-out set

Run all three variants on `heldout_test.jsonl` (the agent's `scripts/eval_gloss.py` does this locally; in Colab you can check the model part first):

```python
import sacrebleu, json
rows = [json.loads(l) for l in open("heldout_test.jsonl")]
preds = []
for r in rows:
    ids = tok(PREFIX + r["text"], return_tensors="pt").input_ids.to(model.device)
    out = model.generate(ids, max_new_tokens=96, num_beams=4)
    preds.append(tok.decode(out[0], skip_special_tokens=True).strip())
exact = sum(p.upper() == r["gloss"].upper() for p, r in zip(preds, rows)) / len(rows)
bleu = sacrebleu.corpus_bleu(preds, [[r["gloss"] for r in rows]]).score
print(f"exact={exact:.2%}  BLEU={bleu:.1f}")
```

Report a table like this in `docs/evaluation.md` with real numbers:

| Variant | Exact match | BLEU | p95 latency |
|---|---|---|---|
| Rules only | | | |
| Model only | | | |
| Hybrid (rules first, model for unmapped words) | | | |

Read a dozen wrong predictions by eye. Note the failure patterns for your Q&A.

---

## Step 7 — Export for fast CPU inference

Convert to CTranslate2 with int8 quantization so it runs fast on the demo laptop:

```python
!ct2-transformers-converter --model out_stage2/best --output_dir gloss-t5-ct2 --quantization int8
tok.save_pretrained("gloss-t5-ct2")      # keep the tokenizer files alongside
```

Download the `gloss-t5-ct2/` folder (Drive or zip) and place it at `models/gloss-t5-ct2/` in the project. Roughly what the backend does at inference (the agent writes this, shown for understanding):

```python
import ctranslate2
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained("models/gloss-t5-ct2")
tr = ctranslate2.Translator("models/gloss-t5-ct2", device="cpu")
def gloss(text):
    toks = tok.convert_ids_to_tokens(tok.encode("translate English to ASL gloss: " + text))
    out = tr.translate_batch([toks], beam_size=2, max_decoding_length=96)[0].hypotheses[0]
    return tok.decode(tok.convert_tokens_to_ids(out), skip_special_tokens=True)
```

Measure p50/p95 latency **on the actual demo laptop**, not on Colab.

---

## Step 8 — Ship it safely

1. Message Antigravity: `approve` (F1b). It loads the model, runs the comparison, and picks the config by the numbers.
2. Keep the flag **off by default** unless the model clearly wins on accuracy and meets the latency budget.
3. Every model output goes through validation: unknown tokens are mapped or fingerspelled, and bad output falls back to the rules. Test by deleting the model folder and confirming the app still works.
4. Copy the model into the demo build and **test offline**. Nothing should download at runtime.

---

## What to say to judges

> "We built a rule-based ASL grammar engine, then fine-tuned a small T5 model in two stages: first on a public English-to-gloss corpus, then on our own medical, classroom and help-desk sentences. We evaluated both on a held-out test set we wrote ourselves. [State the real result.] The model runs behind validation and an automatic fallback, so the demo never depends on it."

Say plainly that the public corpus is synthetic, that our vocabulary is limited, and that the next step is validation with Deaf signers.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `load_dataset` fails on the script | Keep `datasets<4.0`, or download the raw `.en`/`.asl` files and read them manually |
| Loss is `nan` | Confirm `fp16=False`; lower the learning rate to 1e-4 |
| Output repeats words | Use `num_beams=4`, `no_repeat_ngram_size=3`, and let validation reject repeats |
| Model too slow on CPU | Use the CTranslate2 int8 export, greedy/beam 2, and short inputs; otherwise ship rules-only |
| Model ignores your vocabulary | Add more domain pairs, raise stage 2 epochs, and keep synonym mapping after the model |
| Colab disconnects | Save checkpoints to Google Drive each epoch |
