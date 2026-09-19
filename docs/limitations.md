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
| **Vocabulary Scope** | 60 core high-frequency domain signs + 36 fingerspelling signs (A–Z, 0–9). | Extended vocabulary expansion via multi-signer CV recording. |
| **Spatial Reference (Loci)** | Fixed 2D skeleton pose and 21-landmark hand coordinate tracking. | 3D spatial indexation and pronoun directional agreement (loci setup). |
| **Non-Manual Markers (NMM)** | Visual brow-raise (Y/N questions) and furrowed-brow (WH questions) indicators. | Full 3D facial mesh animation (mouth morphemes, head tilts, eye gaze). |
| **Classifiers & Depicting Signs** | Lexicalized signs and discrete gestures. | Complex spatial classifier predicates and size/shape specifiers. |
| **Bidirectionality** | Speech/Text $\rightarrow$ ASL Avatar. | Reverse ASL Sign $\rightarrow$ Spoken English translation. |

---

## 4. Accessibility & Inclusive Design Standards

- **WCAG 2.2 AA Compliance:** High-contrast mode (contrast ratio $\ge 7:1$), full keyboard navigation, ARIA live regions for screen readers, adjustable caption typography, and mirror views.
- **Backpressure & Speed Control:** Dynamic rate adaptation keeps video latency under 4 seconds without frame loss.
- **Fail-Safe Fallbacks:** Typed input remains functional even when microphone permissions or browser speech APIs are unavailable.

---

## 5. Ethical Commitment & Community Validation

Assistive communication technology in healthcare and public services must be evaluated directly with native Deaf signers and certified ASL interpreters (RID/NAD). SignBridge serves as an accessible reference prototype and interactive foundation for ongoing community-centered research.
