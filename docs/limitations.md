# SignBridge — Linguistic & Assistive Scope Limitations

**Document Version:** 1.0  
**Phase:** 6 (Accessibility & Production Polish)  
**Last Updated:** 2026-09-19  

---

## 1. Executive Summary & Purpose

SignBridge is an assistive prototype designed to bridge immediate communication gaps between hearing and Deaf or hard-of-hearing individuals in high-stakes environments such as **doctor visits, emergency help desks, and classrooms**.

To ensure responsible and ethical technology development, this document transparently states the linguistic, technical, and structural boundaries of the current system.

---

## 2. Linguistic Nature of American Sign Language (ASL)

1. **ASL is Not Encoded English:**
   - American Sign Language is an independent, natural human language with its own distinct phonology, morphology, syntax, and discourse structure.
   - Word-for-word substitution (Signed Exact English) does not represent natural ASL.

2. **Grammar Transformations Supported:**
   - **Topic-Comment Ordering:** Objects and topics are placed at the front when appropriate (e.g., *"DOCTOR WHERE"*).
   - **Time-First Structuring:** Temporal markers precede clauses (e.g., *"YESTERDAY ME GO HOSPITAL"*).
   - **Tense Markers:** Past and future actions utilize lexical aspect markers (`FINISH`, `WILL`) rather than English inflections.
   - **Copula & Article Omission:** Articles (*a, an, the*) and copulas (*is, am, are, be*) are omitted in ASL gloss notation.
   - **Question Syntax:** WH-words (*WHAT, WHERE, WHEN, WHO, WHY, HOW*) migrate to clause-final positions.

3. **Fingerspelling Fallback:**
   - Proper nouns, names, and out-of-vocabulary terms are automatically decomposed into character-level fingerspelling sequences (A–Z, 0–9).

---

## 3. Current System Boundaries & Constraints

| Dimension | Current Implementation | Boundary / Future Roadmap |
|---|---|---|
| **Vocabulary & Provenance** | 98 total signs (34 Real, 30 Spec-Compiled Handshape-First, 34 Synthetic Fallback). | 30 specs compiled from 47 canonical handshapes. 100% demo scenario coverage. |
| **Linguistic Verification** | 0 / 30 sign specifications currently verified by an external certified signer (`verified_by: null`). All specs marked `[UNVERIFIED]`. | Formal verification audit with certified Deaf ASL interpreters (RID/NAD). |
| **Speech Recognition** | Browser Web Speech API (uses Google cloud service in Chrome) + 100% offline local typed input. | Fully local offline neural ASR model (e.g. Whisper.cpp/Vosk). |
| **Spatial Reference (Loci)** | Fixed 2D skeleton pose and procedural 3D mannequin avatar with analytical IK solver ($L_1=0.420, L_2=0.380$). | Full 3D spatial indexation and pronoun directional agreement (loci setup). |
| **Non-Manual Markers (NMM)** | Visual brow-raise (Y/N questions) and furrowed-brow (WH questions) indicators. | Full 3D facial mesh animation (mouth morphemes, head tilts, eye gaze). |
| **Classifiers & Depicting Signs** | Handshape-first keyframed classifiers and lexicalized signs. | Complex spatial classifier predicates and size/shape specifiers. |
| **Bidirectionality** | Speech/Text $\rightarrow$ ASL Avatar. | Reverse ASL Sign $\rightarrow$ Spoken English translation. |

---

## 4. Accessibility & Inclusive Design Standards

- **WCAG 2.2 AA Compliance:** High-contrast mode (contrast ratio $\ge 7:1$), full keyboard navigation (hotkeys 1-5), ARIA live regions for screen readers, adjustable caption typography, and mirror views (<kbd>M</kbd>).
- **Backpressure & Speed Control:** Dynamic rate adaptation keeps video latency under 4 seconds without frame loss.
- **Fail-Safe Fallbacks:** Typed input remains functional even when microphone permissions or browser speech APIs are unavailable.
- **Pre-Flight Verification:** Built-in `/selfcheck` pre-flight modal and real-time provenance tracking in the Debug overlay.

---

## 5. Ethical Commitment & Community Validation

Assistive communication technology in healthcare and public services must be evaluated directly with native Deaf signers and certified ASL interpreters (RID/NAD). SignBridge serves as an accessible reference prototype and interactive foundation for ongoing community-centered research. Sign specifications are derived from standard ASL educational references without generative hallucination, but remain explicitly flagged as `[UNVERIFIED]` until community verification.
